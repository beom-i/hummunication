"use client";

import { CardPagesProvider } from "@/features/weekly/templates/card-pages";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadWeekly, saveWeekly } from "@/features/weekly/actions";
import { prepareWeeklyPhotos, weeklyValuesForSave, refreshRecoveredPhotos } from "@/features/weekly/client";
import { setFormErrors } from "@/lib/form-errors";
import { invalidInput } from "@/lib/result";
import { legacyWeeklySchema } from "@/features/bulletins/schemas";
import type { WeeklyRecord } from "@/features/weekly/schemas";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WorkIntro } from "@/features/workspace/components/work-intro";
import { useSidebar } from "@/components/ui/sidebar";
import { bulletinHref } from "@/features/bulletins/utils/format";
import { allowBulletinEdit, canEditBulletin, endBulletinEdit, findBulletin, markBulletinMigrated, loadPendingWeekly, savePendingWeekly, clearPendingWeekly, legacyDraftKey } from "@/features/bulletins/utils/local-store";
import { FieldError } from "@/components/ui/field";
import { WeeklyHeading, WeeklyFooter } from "./weekly-layout";
import { WeeklyStepSkeleton, WeeklyLoadingScreen } from "./weekly-skeleton";
import { ProgressSidebar } from "./progress-sidebar";
import { useWeeklyTransition } from "../hooks/use-weekly-transition";
import { weeklyHeading, weeklyLocation, weeklyIndicatorStep, boundedEntryIndex } from "../utils/workflow";
import { sidebarOffset } from "@/features/workspace/utils/sidebar-offset";
import { upcomingPublishDates } from "../utils/publish-dates";
import { WeeklyStepContent } from "./weekly-step-content";
import "./weekly-workspace.css";
import { weeklyDefaultValues, weeklyDraftSchema, weeklySchema, type WeeklyFormData } from "../schemas";
import { SermonPagesProvider } from "@/features/weekly/templates/sermon-pages";

export function WeeklyWorkspace() {
  const search = useSearchParams();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const main = useRef<HTMLElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [progressOpen, setProgressOpen] = useState(true);
  const [savedAt, setSavedAt] = useState("");
  const [pending, startTransition] = useTransition();
  const editingId = search.get("bulletin");
  const [readyFor, setReadyFor] = useState<string | null | undefined>(undefined);
  const stored = useRef<WeeklyRecord | null>(null);
  const savedRef = useRef<string | null>(null);
  const { step, view } = weeklyLocation(search);
  const { navigate, loading, loadingTarget } = useWeeklyTransition(main, editingId, pending);
  const methods = useForm<WeeklyFormData>({ resolver: zodResolver(weeklySchema), defaultValues: { ...weeklyDefaultValues, date: "", sermon: { ...weeklyDefaultValues.sermon, date: "" } }, mode: "onTouched" });
  const { reset, setError, clearErrors, getValues, trigger, formState: { errors } } = methods;
  const sections = useWatch({ control: methods.control, name: "sections" });
  const families = useWatch({ control: methods.control, name: "families" });
  const senders = useWatch({ control: methods.control, name: "senders" }) ?? [];
  const draftKey = editingId ? `${legacyDraftKey}.${editingId}` : legacyDraftKey;
  useEffect(() => {
    if (savedRef.current === editingId && editingId) {
      setReadyFor(editingId);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        stored.current = null;
        if (editingId) {
          if (!canEditBulletin(editingId)) { router.replace(bulletinHref(editingId)); return; }
          const result = await loadWeekly(editingId);
          if (cancelled) return;
          if (result.ok) {
            const recovery = loadPendingWeekly(editingId);
            stored.current = result.data;
            if (recovery) {
              stored.current = null;
              if (recovery.ref) stored.current = { ...result.data, ref: recovery.ref };
            }
            reset(recovery ? refreshRecoveredPhotos(recovery.data, result.data.data) : result.data.data);
          }
          else {
            const recovery = loadPendingWeekly(editingId);
            const local = recovery ? { data: recovery.data } : findBulletin(editingId);
            if (recovery?.ref) stored.current = { id: editingId, data: recovery.data, ref: recovery.ref, updatedAt: new Date().toISOString() };
            if (local && (result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED")) reset(local.data);
            else { setError("root", { type: "load", message: result.error.message }); }
          }
        } else {
          const dates = upcomingPublishDates();
          const date = dates[1];
          let values = { ...weeklyDefaultValues, date, sermon: { ...weeklyDefaultValues.sermon, date } };
          let invalidDraft = false;
          const saved = localStorage.getItem(legacyDraftKey);
          if (saved) {
            let parsed: unknown;
            try { parsed = JSON.parse(saved); } catch { parsed = null; }
            const result = legacyWeeklySchema.safeParse(parsed);
            if (result.success) {
              values = result.data;
              if (!dates.includes(result.data.date)) values = { ...result.data, date, sermon: { ...result.data.sermon, date } };
            }
            else invalidDraft = true;
          }
          reset(values);
          if (invalidDraft) setError("root", { message: "이전 입력을 확인해 주세요. 원본은 브라우저에 남아 있어요" });
        }
        if (editingId && !stored.current && !loadPendingWeekly(editingId)) {
          const draft = localStorage.getItem(draftKey);
          if (draft) { const parsed = weeklyDraftSchema.safeParse(JSON.parse(draft)); if (parsed.success && parsed.data.date === editingId) reset(parsed.data); }
        }
        setReadyFor(editingId);
      } catch {
        if (!cancelled) { setError("root", { message: "주보를 불러오지 못했어요. 연결과 브라우저 저장 공간을 확인해 주세요" }); setReadyFor(editingId); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [editingId, reset, setError, router, draftKey]);

  useEffect(() => {
    if (readyFor !== editingId) return;
    const unsubscribe = methods.subscribe({ formState: { values: true }, callback: () => {
      clearTimeout(draftTimer.current);
      setSavedAt("");
      draftTimer.current = setTimeout(() => {
        const result = weeklyDraftSchema.safeParse(getValues());
        if (!result.success) return;
        savePendingWeekly(result.data, stored.current?.ref ?? null);
        try { localStorage.setItem(draftKey, JSON.stringify(result.data)); setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })); }
        catch { setError("root", { message: "자동 저장하지 못했어요. 저장 공간을 확인해 주세요" }); }
      }, 1000);
    } });
    return () => { unsubscribe(); clearTimeout(draftTimer.current); };
  }, [methods, getValues, readyFor, editingId, draftKey, setError]);

  const finishIntro = useCallback(() => window.history.replaceState(null, "", "/weekly?step=1"), []);
  const save = (close = false) => startTransition(async () => {
    clearErrors();
    const parsed = weeklyDraftSchema.safeParse(getValues());
    if (!parsed.success) {
      const error = invalidInput(parsed.error);
      if (!error.ok) { setFormErrors(methods, error.error); toast.error(error.error.message); }
      return;
    }
    try {
      // Preserve legacy/local input until the complete server write succeeds.
      savePendingWeekly(parsed.data, stored.current?.ref ?? null);
      try { localStorage.setItem(legacyDraftKey, JSON.stringify(parsed.data)); } catch { /* Large images can exceed browser storage; server saving still works. */ }
      const photos = await prepareWeeklyPhotos(parsed.data);
      if (!photos.ok) { setFormErrors(methods, photos.error); toast.error(photos.error.message); return; }
      photos.data.families.forEach((group, index) => methods.setValue(`families.${index}.photo_id`, group.photo_id));
      methods.setValue("sermon.thumbnailId", photos.data.sermon.thumbnailId);
      savePendingWeekly(photos.data, stored.current?.ref ?? null);
      const result = await saveWeekly({ ref: stored.current?.ref ?? null, values: weeklyValuesForSave(photos.data) });
      if (!result.ok) { setFormErrors(methods, result.error); toast.error(result.error.message); return; }
      stored.current = result.data;
      savedRef.current = result.data.id;
      reset(result.data.data);
      clearTimeout(draftTimer.current);
      try { markBulletinMigrated(result.data.id); } catch { /* The saved server record is authoritative. */ }
      clearPendingWeekly(result.data.id);
      toast.success("저장했어요", { description: "팀에서 함께 확인할 수 있어요" });
      if (close) {
        endBulletinEdit(result.data.id);
        router.push(bulletinHref(result.data.id));
      } else if (!editingId) {
        allowBulletinEdit(result.data.id);
        const params = new URLSearchParams(window.location.search);
        params.set("bulletin", result.data.id);
        window.history.replaceState(null, "", `/weekly?${params}`);
      }
    } catch {
      const message = "저장 결과와 연결을 확인해 주세요. 현재 입력은 유지됩니다";
      setError("root", { type: "server", message }); toast.error(message);
    }
  });
  const finishContent = () => navigate(3);
  const afterFamily = () => {
    if (getValues("sections").includes("senders")) return navigate(2, "senders");
    finishContent();
  };
  const afterSermon = () => {
    if (getValues("sections").includes("family")) return navigate(2, "families");
    afterFamily();
  };
  const next = async () => {
    if (step === 1) {
      if (!await trigger("date")) return;
      if (!editingId) methods.setValue("sermon.date", getValues("date"));
      navigate(2);
      return;
    }
    const sections = getValues("sections");
    if (view === "options") {
      if (!await trigger("sections")) return;
      if (sections.includes("sermon")) navigate(2, "sermon");
      else if (sections.includes("family")) navigate(2, "families");
      else afterFamily();
    } else if (view === "sermon") {
      if (await trigger(["sermon.date", "sermon.speaker", "sermon.title", "sermon.bible"])) navigate(2, "sermon-preview");
    } else if (view === "sermon-preview") { if (await trigger("sermon.content")) afterSermon(); }
    else if (view === "families") { if (await trigger("families")) afterFamily(); }
    else if (view === "family-card-edit") {
      if (await trigger(`families.${groupIndex}`)) navigate(2, "families");
    }
    else if (view === "senders") { if (await trigger("senders")) finishContent(); }
    else if (view === "sender-edit") { if (await trigger(`senders.${senderIndex}`)) navigate(2, "senders"); }
    else finishContent();
  };
  const back = () => {
    if (step === 1) router.push(editingId ? bulletinHref(editingId) : "/home");
    else if (step === 3) navigate(2);
    else if (view === "options") navigate(1);
    else if (view === "sermon") navigate(2);
    else if (view === "sermon-preview") navigate(2, "sermon");
    else if (view === "family-card-edit") navigate(2, "families");
    else if (view === "sender-edit") navigate(2, "senders");
    else if (view === "senders") { if (sections.includes("family")) navigate(2, "families"); else if (sections.includes("sermon")) navigate(2, "sermon-preview"); else navigate(2); }
    else navigate(2);
  };
  const groupIndex = boundedEntryIndex(search.get("group"), families.length);
  const senderIndex = boundedEntryIndex(search.get("group"), senders.length);
  const cardParam = Number(search.get("card") ?? 0);
  const editingEntry = view === "family-card-edit" || view === "sender-edit";
  useEffect(() => { main.current?.scrollTo({ top: 0, behavior: "instant" }); }, [step, view, groupIndex, senderIndex]);
  const transitionKey = `${step}-${view}-${view.startsWith("sender") ? senderIndex : groupIndex}`;
  const heading = weeklyHeading(step, view, !!editingId);
  let nextLabel = "다음";
  if (step === 3) nextLabel = "저장";
  else if (editingEntry) nextLabel = "완료하기";

  if (search.get("intro") === "1") return <div className="home-theme fixed inset-0 z-40"><WorkIntro onComplete={finishIntro} /></div>;

  if (readyFor !== editingId) return <WeeklyLoadingScreen step={step} view={view} />;

  if (errors.root?.type === "load") return <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 px-6"><FieldError errors={[errors.root]} /><Button asChild><Link href={`/auth/login?next=${encodeURIComponent(`/weekly?bulletin=${editingId}&step=2`)}`}>팀원 로그인</Link></Button><Button asChild variant="outline"><Link href="/home">홈으로</Link></Button></main>;

  return (
    <FormProvider {...methods}>
      <SermonPagesProvider><CardPagesProvider>
      <main ref={main} inert={pending} aria-busy={pending} className="weekly-main weekly-workspace min-w-0 flex-1 pb-[100px]" data-progress-open={progressOpen} style={{ "--weekly-sidebar-offset": sidebarOffset(isMobile, state) } as React.CSSProperties}>
      <ProgressSidebar step={step} view={view} open={progressOpen} onToggle={() => setProgressOpen(value => !value)} onNavigate={navigate} loading={loading} />
      <WeeklyHeading step={weeklyIndicatorStep(step, view)} {...heading} contentKey={transitionKey} />
      <div className="weekly-content-frame" data-loading={loading} aria-busy={loadingTarget !== null}>
          <div key={transitionKey} className="weekly-content weekly-page-enter" inert={loading} aria-hidden={loading}>
            <WeeklyStepContent step={step} view={view} editingId={editingId} groupIndex={groupIndex} senderIndex={senderIndex} cardIndex={Number.isInteger(cardParam) && cardParam >= 0 ? cardParam : 0} familyCount={families.length} senderCount={senders.length} onNavigate={navigate} />

          </div>
          {loadingTarget && <div className="weekly-skeleton-layer" aria-hidden={!loading}>
            <WeeklyStepSkeleton step={loadingTarget.step} view={loadingTarget.view} />
          </div>}
          {loading && <span role="status" className="sr-only">화면을 불러오는 중이에요</span>}
      </div>
      <div className="mx-auto w-full max-w-[480px] px-4" aria-live="polite">
        {step !== 1 && <FieldError errors={[errors.root]} />}
        {errors.root && <Button asChild variant="link"><Link target="_blank" rel="noreferrer" href={`/auth/login?next=${encodeURIComponent("/weekly" + (editingId ? `?bulletin=${editingId}&step=${step}` : "?step=1"))}`}>팀원 로그인</Link></Button>}
      </div>
      {step === 2 && view !== "options" && <p className="weekly-draft-status px-5 py-3 text-center text-xs text-muted-foreground" aria-live="polite">{savedAt ? `이 브라우저에 보관됨 ${savedAt}` : "입력 내용은 이 브라우저에 보관돼요"}</p>}
      <WeeklyFooter nextDisabled={step === 2 && view === "options" && !sections.length} onBack={back} onSave={() => save()} busy={pending} showSave={step !== 3} onNext={step !== 3 ? next : () => save(true)} nextLabel={nextLabel} />
      </main>
      </CardPagesProvider></SermonPagesProvider>
    </FormProvider>
  );
}
