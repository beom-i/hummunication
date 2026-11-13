"use client";

import { sidebarOffset } from "@/features/workspace/utils/sidebar-offset";

import { CardPagesProvider } from "@/features/weekly/templates/card-pages";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { reportServerError } from "@/features/auth/utils/report-server-error";
import { loadWeekly, deleteWeekly } from "@/features/weekly/actions";
import type { WeeklyRecord } from "@/features/weekly/schemas";
import { ArrowLeft, Pencil, LockKeyhole, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { SermonPagesProvider } from "@/features/weekly/templates/sermon-pages";
import { WeeklyResults } from "@/features/weekly/components/weekly-results";
import type { WeeklyFormData } from "@/features/weekly/schemas";
import { findBulletin, allowBulletinEdit, loadSavedBulletins } from "@/features/bulletins/utils/local-store";
import { bulletinDateCode, bulletinTitle } from "@/features/bulletins/utils/format";
import { editPasswordSchema, editPasswordDefaults, type EditPasswordData, type SavedBulletin } from "@/features/bulletins/schemas";

function SavedBulletinView({ record, sample }: { record: SavedBulletin | WeeklyRecord; sample: boolean }) {
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const methods = useForm<WeeklyFormData>({ defaultValues: record.data });
  const [unlocking, setUnlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const remove = () => startDelete(async () => {
    if (!("ref" in record)) return;
    methods.clearErrors("root");
    try {
      const result = await deleteWeekly(record.ref);
      if (!result.ok) { methods.setError("root", { message: result.error.message }); reportServerError(result.error); return; }
      toast.success("주보를 삭제했어요"); router.push("/home"); router.refresh();
    } catch { const message = "삭제 결과를 확인한 뒤 다시 시도해 주세요"; methods.setError("root", { message }); toast.error(message); }
  });
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<EditPasswordData>({ resolver: zodResolver(editPasswordSchema), defaultValues: editPasswordDefaults });
  const unlock = handleSubmit(values => {
    if (values.password !== bulletinDateCode(record.id)) { setError("root", { message: "편집 비밀번호가 맞지 않아요. 날짜를 다시 확인해 주세요" }); return; }
    try { allowBulletinEdit(record.id); }
    catch { setError("root", { message: "브라우저 저장 공간을 확인해 주세요" }); return; }
    setUnlocking(false); reset(editPasswordDefaults);
    router.push(`/weekly?bulletin=${record.id}&step=2`);
  });
  return <FormProvider {...methods}><SermonPagesProvider><CardPagesProvider>
    <main className="weekly-main min-w-0 flex-1 px-6 pt-16 pb-[100px] max-sm:px-4" style={{ "--weekly-sidebar-offset": sidebarOffset(isMobile, state) } as React.CSSProperties}>
      <header className="mx-auto w-full max-w-[1200px]">
        <Button asChild variant="ghost" className="mb-6 -ml-3"><Link href="/home"><ArrowLeft className="size-4" />홈으로</Link></Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 flex items-center gap-2 text-sm text-secondary-foreground"><LockKeyhole className="size-4" />보기 모드{sample && <span className="rounded-md bg-secondary px-2 py-1 text-xs">샘플 자료</span>}</p><h1 className="text-3xl font-extrabold tracking-tight max-sm:text-2xl">{bulletinTitle(record.id)}</h1><p className="mt-2 text-sm text-muted-foreground">{record.id.replaceAll("-", ". ")}. 발행{!sample && ` · ${new Date(record.updatedAt).toLocaleString("ko-KR")} 저장`}</p></div>
          <div className="flex gap-2">{"ref" in record && <Button variant="outline" onClick={() => setDeleting(true)}><Trash2 className="size-4" />삭제</Button>}<Button onClick={() => { reset(editPasswordDefaults); setUnlocking(true); }} className="gap-2 rounded-xl px-5"><Pencil className="size-4" />수정</Button></div>
        </div>
        {record.data.sections.includes("sermon") && <dl className="mt-7 grid grid-cols-2 gap-5 rounded-2xl border bg-card p-5 max-sm:grid-cols-1">{[["설교 날짜", record.data.sermon.date], ["설교자", record.data.sermon.speaker], ["설교 제목", record.data.sermon.title], ["성경 본문", record.data.sermon.bible]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value || "입력 전"}</dd></div>)}</dl>}
      </header>
      <FieldError errors={[methods.formState.errors.root]} />
      <WeeklyResults detail />
    </main>
    <Dialog open={deleting} onOpenChange={open => { if (!deletePending) setDeleting(open); }}><DialogContent className="weekly-popover"><DialogHeader><DialogTitle>주보를 삭제할까요?</DialogTitle><DialogDescription>목록에서 제외되며 설교·문답 원본은 보존됩니다.</DialogDescription></DialogHeader><FieldError errors={[methods.formState.errors.root]} /><div className="flex justify-end gap-2"><Button variant="outline" disabled={deletePending} onClick={() => setDeleting(false)}>취소</Button><Button variant="destructive" loading={deletePending} onClick={remove}>삭제</Button></div></DialogContent></Dialog>
    <Dialog open={unlocking} onOpenChange={open => { setUnlocking(open); if (!open) reset(editPasswordDefaults); }}>
      <DialogContent className="weekly-popover rounded-2xl">
        <DialogHeader><DialogTitle>주보 수정</DialogTitle><DialogDescription>주보 발행일 6자리(YYMMDD)를 입력해 주세요.</DialogDescription></DialogHeader>
        <form onSubmit={unlock} noValidate className="space-y-5">
          <Field data-invalid={!!errors.password}><FieldLabel htmlFor="bulletin-password">편집 비밀번호</FieldLabel><PasswordInput id="bulletin-password" inputMode="numeric" maxLength={6} autoComplete="off" placeholder="날짜 6자리" {...register("password")} aria-invalid={!!errors.password} /><FieldError errors={[errors.password]} /></Field>
          <FieldError errors={[errors.root]} />
          <Button type="submit" loading={isSubmitting} className="h-11 w-full rounded-xl">수정 모드로 열기</Button>
        </form>
      </DialogContent>
    </Dialog>
  </CardPagesProvider></SermonPagesProvider></FormProvider>;
}

export function BulletinDetail() {
  const date = useSearchParams().get("date") ?? "";
  const [loaded, setLoaded] = useState<{ record: SavedBulletin | WeeklyRecord | null; sample: boolean; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await loadWeekly(date);
        if (cancelled) return;
        if (result.ok) setLoaded({ record: result.data, sample: false });
        else if (result.error.code === "NOT_FOUND") {
          const local = findBulletin(date);
          setLoaded({ record: local, sample: !loadSavedBulletins().some(record => record.id === date), error: local ? undefined : result.error.message });
          if (!local) reportServerError(result.error);
        } else { setLoaded({ record: null, sample: false, error: result.error.message }); reportServerError(result.error); }
      } catch {
        if (!cancelled) {
          const message = "주보를 불러오지 못했어요. 연결을 확인해 주세요";
          setLoaded({ record: null, sample: false, error: message }); toast.error(message);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [date]);
  if (!loaded) return <main className="flex min-h-svh flex-1 items-center justify-center gap-2"><Spinner />주보를 불러오는 중이에요</main>;
  if (!loaded.record) return <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-5 px-6 text-center"><h1 className="text-xl font-bold">{loaded.error ?? "주보를 찾을 수 없어요"}</h1><p className="text-sm text-muted-foreground">팀원 로그인 또는 주보 발행일을 확인해 주세요.</p><Button asChild><Link href={`/auth/login?next=${encodeURIComponent(`/bulletins?date=${date}`)}`}>팀원 로그인</Link></Button><Button asChild variant="outline"><Link href="/home">홈으로</Link></Button></main>;
  return <SavedBulletinView key={`${loaded.record.id}-${loaded.record.updatedAt}`} record={loaded.record} sample={loaded.sample} />;
}
