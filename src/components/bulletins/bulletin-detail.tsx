"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { SermonPagesProvider } from "@/components/weekly/sermon-pagination";
import { WeeklyResults } from "@/components/weekly/weekly-results";
import type { WeeklyFormData } from "@/components/weekly/schemas";
import { findBulletin, allowBulletinEdit, loadSavedBulletins } from "./local-store";
import { bulletinDateCode, bulletinTitle } from "./format";
import { editPasswordSchema, editPasswordDefaults, type EditPasswordData, type SavedBulletin } from "./schemas";

function SavedBulletinView({ record, sample }: { record: SavedBulletin; sample: boolean }) {
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const methods = useForm<WeeklyFormData>({ defaultValues: record.data });
  const [unlocking, setUnlocking] = useState(false);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<EditPasswordData>({ resolver: zodResolver(editPasswordSchema), defaultValues: editPasswordDefaults });
  const unlock = handleSubmit(values => {
    if (values.password !== bulletinDateCode(record.id)) { setError("root", { message: "편집 비밀번호가 맞지 않아요. 날짜를 다시 확인해 주세요" }); return; }
    try { allowBulletinEdit(record.id); }
    catch { setError("root", { message: "브라우저 저장 공간을 확인해 주세요" }); return; }
    setUnlocking(false); reset(editPasswordDefaults);
    router.push(`/weekly?bulletin=${record.id}&step=2`);
  });
  return <FormProvider {...methods}><SermonPagesProvider>
    <main className="weekly-main min-w-0 flex-1 px-6 pt-16 pb-[100px] max-sm:px-4" style={{ "--weekly-sidebar-offset": isMobile ? "0px" : state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)" } as React.CSSProperties}>
      <header className="mx-auto w-full max-w-[1200px]">
        <Button asChild variant="ghost" className="mb-6 -ml-3"><Link href="/home"><ArrowLeft className="size-4" />홈으로</Link></Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 flex items-center gap-2 text-sm text-secondary-foreground"><LockKeyhole className="size-4" />보기 모드{sample && <span className="rounded-md bg-secondary px-2 py-1 text-xs">샘플 자료</span>}</p><h1 className="text-3xl font-extrabold tracking-tight max-sm:text-2xl">{bulletinTitle(record.id)}</h1><p className="mt-2 text-sm text-muted-foreground">{record.id.replaceAll("-", ". ")}. 발행{!sample && ` · ${new Date(record.updatedAt).toLocaleString("ko-KR")} 저장`}</p></div>
          <Button onClick={() => { reset(editPasswordDefaults); setUnlocking(true); }} className="gap-2 rounded-xl px-5"><Pencil className="size-4" />수정</Button>
        </div>
        {record.data.sections.includes("sermon") && <dl className="mt-7 grid grid-cols-2 gap-5 rounded-2xl border bg-card p-5 max-sm:grid-cols-1">{[["설교 날짜", record.data.sermon.date], ["설교자", record.data.sermon.speaker], ["설교 제목", record.data.sermon.title], ["성경 본문", record.data.sermon.passage]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value || "입력 전"}</dd></div>)}</dl>}
      </header>
      <WeeklyResults detail />
    </main>
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
  </SermonPagesProvider></FormProvider>;
}

export function BulletinDetail() {
  const date = useSearchParams().get("date") ?? "";
  const [loaded, setLoaded] = useState<{ record: SavedBulletin | null; sample: boolean; error?: string } | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setLoaded({ record: findBulletin(date), sample: !loadSavedBulletins().some(record => record.id === date) }); }
      catch { setLoaded({ record: null, sample: false, error: "주보를 불러오지 못했어요. 브라우저 저장 공간을 확인해 주세요" }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [date]);
  if (!loaded) return <main className="flex min-h-svh flex-1 items-center justify-center gap-2"><Spinner />주보를 불러오는 중이에요</main>;
  if (!loaded.record) return <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-5 px-6 text-center"><h1 className="text-xl font-bold">{loaded.error ?? "주보를 찾을 수 없어요"}</h1><p className="text-sm text-muted-foreground">저장한 브라우저에서 다시 확인해 주세요.</p><Button asChild><Link href="/home">홈으로</Link></Button></main>;
  return <SavedBulletinView key={`${loaded.record.id}-${loaded.record.updatedAt}`} record={loaded.record} sample={loaded.sample} />;
}
