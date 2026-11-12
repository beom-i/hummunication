"use client";

import Link from "next/link";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { loadWeekly, saveWeekly } from "@/features/weekly/actions";
import { prepareWeeklyPhotos, weeklyValuesForSave } from "@/features/weekly/client";
import { setFormErrors } from "@/lib/form-errors";
import { invalidInput } from "@/lib/result";
import { legacyWeeklySchema } from "@/components/bulletins/schemas";
import type { WeeklyRecord } from "@/features/weekly/schemas";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WorkIntro } from "@/components/home/work-intro";
import { PublishDate } from "./publish-date";
import { useSidebar } from "@/components/ui/sidebar";
import { bulletinHref } from "@/components/bulletins/format";
import { allowBulletinEdit, canEditBulletin, endBulletinEdit, findBulletin, markBulletinMigrated, loadPendingWeekly, savePendingWeekly, clearPendingWeekly, legacyDraftKey } from "@/components/bulletins/local-store";
import { FieldError } from "@/components/ui/field";
import { WeeklyHeading, WeeklyFooter } from "./weekly-layout";
import { Configuration } from "./configuration";
import { SermonEditor } from "./sermon-editor";
import { FamilyList, FamilyEditor, FamilyPreview, FamilyCardEditor } from "./family-editor";
import { WeeklyResults } from "./weekly-results";
import { WeeklyStepSkeleton, WeeklyLoadingScreen } from "./weekly-skeleton";
import { ProgressSidebar } from "./progress-sidebar";
import { SenderList, SenderEditor } from "./sender-editor";
import { Check } from "lucide-react";
import "./weekly-workspace.css";
import { weeklyDefaultValues, weeklyDraftSchema, weeklySchema, type WeeklyFormData } from "./schemas";
import { SermonPagesProvider } from "./sermon-pagination";

const views = ["options", "sermon", "sermon-preview", "families", "family-edit", "family-preview", "family-card-edit", "senders", "sender-edit"] as const;
export type WeeklyView = typeof views[number] | "senders" | "sender-edit";

export function WeeklyMockup() {
  const search = useSearchParams();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const main = useRef<HTMLElement>(null);
  const navigating = useRef(false);
  const transitionId = useRef(0);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [progressOpen, setProgressOpen] = useState(true);
  const [loadingTarget, setLoadingTarget] = useState<{ step: number; view: WeeklyView; pending: boolean } | null>(null);
  const loading = loadingTarget?.pending === true;
  const [savedAt, setSavedAt] = useState("");
  const [pending, startTransition] = useTransition();
  const editingId = search.get("bulletin");
  const [readyFor, setReadyFor] = useState<string | null | undefined>(undefined);
  const stored = useRef<WeeklyRecord | null>(null);
  const savedRef = useRef<string | null>(null);
  const rawStep = search.get("step");
  const step = rawStep === "3" ? 3 : rawStep === "2" || rawStep === "2-1" ? 2 : 1;
  const rawView = rawStep === "2-1" ? "sermon" : search.get("view");
  const view: WeeklyView = views.find((value) => value === rawView) ?? "options";
  const methods = useForm<WeeklyFormData>({ resolver: zodResolver(weeklySchema), defaultValues: weeklyDefaultValues });
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
            stored.current = recovery ? recovery.ref ? { ...result.data, ref: recovery.ref } : null : result.data;
            reset(recovery?.data ?? result.data.data);
          }
          else {
            const recovery = loadPendingWeekly(editingId);
            const local = recovery ? { data: recovery.data } : findBulletin(editingId);
            if (recovery?.ref) stored.current = { id: editingId, data: recovery.data, ref: recovery.ref, updatedAt: new Date().toISOString() };
            if (local && (result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED")) reset(local.data);
            else { setError("root", { type: "load", message: result.error.message }); }
          }
        } else {
          reset(weeklyDefaultValues);
          const saved = localStorage.getItem(legacyDraftKey);
          if (saved) {
            const result = legacyWeeklySchema.safeParse(JSON.parse(saved));
            if (result.success) { reset(result.data); }
            else setError("root", { message: "이전 입력을 확인해 주세요. 원본은 브라우저에 남아 있어요" });
          }
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

  const transitionTo = useCallback(async (nextStep: number, nextView: WeeklyView, commit?: () => void) => {
    const id = ++transitionId.current;
    navigating.current = true;
    const transitionStartedAt = performance.now();
    flushSync(() => setLoadingTarget({ step: nextStep, view: nextView, pending: true }));
    const animations: Animation[] = [];
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        main.current?.querySelectorAll<HTMLElement>(".weekly-heading-copy, .weekly-content").forEach(element => {
          animations.push(element.animate([{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }], { duration: 120, easing: "ease-out", fill: "forwards" }));
        });
        await Promise.allSettled(animations.map(animation => animation.finished));
      }
      if (id !== transitionId.current || !main.current?.isConnected) return;
      flushSync(() => {
        main.current?.scrollTo({ top: 0, behavior: "instant" });
        commit?.();
      });
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      await document.fonts.ready;
      const images = Array.from(main.current?.querySelectorAll<HTMLImageElement>(".weekly-content img") ?? []);
      await Promise.all(images.filter(image => !image.complete && image.loading !== "lazy" && image.getClientRects().length > 0).map(image => image.decode().catch(() => undefined)));
      const remaining = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, 240 - (performance.now() - transitionStartedAt));
      if (remaining) await new Promise(resolve => window.setTimeout(resolve, remaining));
    } finally {
      animations.forEach(animation => animation.cancel());
      if (id === transitionId.current) {
        if (main.current?.isConnected && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setLoadingTarget(target => target ? { ...target, pending: false } : null);
          await new Promise(resolve => window.setTimeout(resolve, 180));
        }
        if (id === transitionId.current) setLoadingTarget(null);
      }
      if (id === transitionId.current) navigating.current = false;
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== "/weekly") return;
      const params = new URLSearchParams(window.location.search);
      const rawStep = params.get("step");
      const nextStep = rawStep === "3" ? 3 : rawStep === "2" || rawStep === "2-1" ? 2 : 1;
      const rawView = rawStep === "2-1" ? "sermon" : params.get("view");
      void transitionTo(nextStep, views.find(value => value === rawView) ?? "options");
    };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [transitionTo]);

  const navigate = (nextStep: number, nextView?: WeeklyView, group?: number, card?: number) => {
    const params = new URLSearchParams({ step: String(nextStep) });
    if (editingId) params.set("bulletin", editingId);
    if (nextView && nextView !== "options") params.set("view", nextView);
    if (group !== undefined) params.set("group", String(group));
    if (card !== undefined) params.set("card", String(card));
    const href = `/weekly?${params}`;
    if (navigating.current || href === window.location.pathname + window.location.search) return;
    void transitionTo(nextStep, nextView ?? "options", () => window.history.pushState(null, "", href));
  };
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
  const afterFamily = () => getValues("sections").includes("senders") ? navigate(2, "senders") : finishContent();
  const afterSermon = () => getValues("sections").includes("family") ? navigate(2, "families") : afterFamily();
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
    else if (view === "families") { if (await trigger("families")) navigate(2, "family-preview"); }
    else if (view === "family-edit" || view === "family-card-edit") {
      if (await trigger(`families.${groupIndex}`)) navigate(2, view === "family-card-edit" ? "family-preview" : "families");
    } else if (view === "family-preview") afterFamily();
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
    else if (view === "family-edit" || view === "family-preview" || view === "family-card-edit") navigate(2, "families");
    else if (view === "sender-edit") navigate(2, "senders");
    else if (view === "senders") { if (sections.includes("family")) navigate(2, "family-preview"); else if (sections.includes("sermon")) navigate(2, "sermon-preview"); else navigate(2); }
    else navigate(2);
  };
  const groupParam = Number(search.get("group") ?? 0);
  const groupIndex = Number.isInteger(groupParam) && groupParam >= 0 && groupParam < families.length ? groupParam : 0;
  const senderIndex = Number.isInteger(groupParam) && groupParam >= 0 && groupParam < senders.length ? groupParam : 0;
  const cardParam = Number(search.get("card") ?? 0);
  const editingEntry = view === "family-edit" || view === "family-card-edit" || view === "sender-edit";
  useEffect(() => { main.current?.scrollTo({ top: 0, behavior: "instant" }); }, [step, view, groupIndex, senderIndex]);
  const transitionKey = `${step}-${view}-${view.startsWith("sender") ? senderIndex : groupIndex}`;
  const title = step === 1 ? `주보 발행 날짜를\n${editingId ? "확인해 주세요" : "선택해 주세요"}` : step === 3 ? "결과물 확인 및 추출" : view === "options" ? "작업할 카드뉴스 유형을\n선택해 주세요" : view.startsWith("sermon") ? "설교 정리본 내용을\n입력해 주세요" : view === "family-preview" || view === "family-card-edit" ? "새가족 문답\n미리보기" : view.startsWith("sender") ? "파송자 내용을\n입력해 주세요" : "새가족 문답 내용을\n입력해 주세요";

  if (search.get("intro") === "1") return <div className="home-theme fixed inset-0 z-40"><WorkIntro onComplete={finishIntro} /></div>;

  if (readyFor !== editingId) return <WeeklyLoadingScreen step={step} view={view} />;

  if (errors.root?.type === "load") return <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 px-6"><FieldError errors={[errors.root]} /><Button asChild><Link href={`/auth/login?next=${encodeURIComponent(`/weekly?bulletin=${editingId}&step=2`)}`}>팀원 로그인</Link></Button><Button asChild variant="outline"><Link href="/home">홈으로</Link></Button></main>;

  return (
    <FormProvider {...methods}>
      <SermonPagesProvider>
      <main ref={main} className="weekly-main weekly-workspace min-w-0 flex-1 pb-[100px]" data-progress-open={progressOpen} style={{ "--weekly-sidebar-offset": isMobile ? "0px" : state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)" } as React.CSSProperties}>
      <ProgressSidebar step={step} view={view} open={progressOpen} onToggle={() => setProgressOpen(value => !value)} onNavigate={navigate} loading={loading} />
      <WeeklyHeading step={view === "options" && step === 2 ? 1 : step} title={title} contentKey={transitionKey} description={step === 1 ? editingId ? "저장된 주보의 발행일이에요" : "발행일(주일) 기준으로 주차가 자동 계산돼요" : undefined} />
      <div className="weekly-content-frame" data-loading={loading} aria-busy={loadingTarget !== null}>
          <div key={transitionKey} className="weekly-content weekly-page-enter" inert={loading} aria-hidden={loading}>
            {step === 1 ? <PublishDate lockedDate={editingId ?? undefined} /> : step === 3 ? <WeeklyResults /> : view === "options" ? <Configuration /> : view === "sermon" || view === "sermon-preview" ? <SermonEditor preview={view === "sermon-preview"} /> : view === "families" ? <FamilyList onEdit={index => navigate(2, "family-edit", index)} /> : view === "family-edit" && families.length ? <FamilyEditor index={groupIndex} /> : view === "family-card-edit" && families.length ? <FamilyCardEditor index={groupIndex} initialPage={Number.isInteger(cardParam) && cardParam >= 0 ? cardParam : 0} /> : view === "family-preview" ? <FamilyPreview onEdit={(index, card) => navigate(2, card === undefined ? "family-edit" : "family-card-edit", index, card)} /> : view === "senders" ? <SenderList onEdit={index => navigate(2, "sender-edit", index)} /> : view === "sender-edit" && senders.length ? <SenderEditor index={senderIndex} count={senders.length} onNavigate={index => navigate(2, "sender-edit", index)} /> : <Configuration />}

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
      {editingEntry ? <div className="weekly-edit-bar"><span className="flex flex-1 items-center gap-2 text-sm text-primary-foreground/70"><Check className="size-4" />{savedAt ? `자동 저장됨 ${savedAt}` : "입력한 내용을 자동으로 저장해요"}</span><Button onClick={next} disabled={pending} className="h-11 rounded-full bg-home-brand px-6 font-bold text-foreground hover:bg-home-brand/85">완료하기</Button></div> : <WeeklyFooter nextDisabled={step === 2 && view === "options" && !sections.length} onBack={back} onSave={() => save()} busy={pending} showSave={step !== 3} onNext={step !== 3 ? next : () => save(true)} nextLabel={step === 3 ? "저장" : "다음"} />}
      </main>
      </SermonPagesProvider>
    </FormProvider>
  );
}
