"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WorkIntro } from "@/components/home/work-intro";
import { PublishDate } from "./publish-date";
import { useSidebar } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { bulletinHref } from "@/components/bulletins/format";
import { allowBulletinEdit, canEditBulletin, endBulletinEdit, findBulletin, legacyDraftKey, saveBulletin } from "@/components/bulletins/local-store";
import { FieldError } from "@/components/ui/field";
import { WeeklyHeading, WeeklyFooter } from "./weekly-layout";
import { Configuration } from "./configuration";
import { SermonEditor } from "./sermon-editor";
import { FamilyList, FamilyEditor, FamilyPreview } from "./family-editor";
import { WeeklyResults } from "./weekly-results";
import { weeklyDefaultValues, weeklyDraftSchema, weeklySchema, type WeeklyFormData } from "./schemas";
import { SermonPagesProvider } from "./sermon-pagination";

const views = ["options", "sermon", "sermon-preview", "families", "family-edit", "family-preview"] as const;
export type WeeklyView = typeof views[number];

export function WeeklyMockup() {
  const search = useSearchParams();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const main = useRef<HTMLElement>(null);
  const [pending, startTransition] = useTransition();
  const editingId = search.get("bulletin");
  const [readyFor, setReadyFor] = useState<string | null | undefined>(undefined);
  const loadedLegacy = useRef(false);
  const activeEdit = useRef<string | null>(null);
  const rawStep = search.get("step");
  const step = rawStep === "3" ? 3 : rawStep === "2" || rawStep === "2-1" ? 2 : 1;
  const rawView = rawStep === "2-1" ? "sermon" : search.get("view");
  const view: WeeklyView = views.find((value) => value === rawView) ?? "options";
  const methods = useForm<WeeklyFormData>({ resolver: zodResolver(weeklySchema), defaultValues: weeklyDefaultValues });
  const { reset, setError, clearErrors, getValues, trigger, formState: { errors } } = methods;
  useEffect(() => {
    activeEdit.current = editingId;
    const frame = requestAnimationFrame(() => {
      try {
        if (editingId) {
          if (!canEditBulletin(editingId)) { router.replace(bulletinHref(editingId)); return; }
          const record = findBulletin(editingId);
          if (!record) { router.replace(bulletinHref(editingId)); return; }
          reset(record.data);
        } else {
          reset(weeklyDefaultValues);
          const saved = localStorage.getItem(legacyDraftKey);
          loadedLegacy.current = false;
          if (saved) {
            const result = weeklyDraftSchema.safeParse(JSON.parse(saved));
            if (result.success) { reset(result.data); loadedLegacy.current = true; }
            else setError("root", { message: "이전에 저장한 내용을 불러오지 못했어요. 원본은 브라우저에 남아 있어요" });
          }
        }
        setReadyFor(editingId);
      } catch {
        if (editingId) { router.replace(bulletinHref(editingId)); return; }
        setError("root", { message: "브라우저 저장 공간을 확인해 주세요" });
        setReadyFor(editingId);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      activeEdit.current = null;
      // Strict Mode immediately reconnects the same editor; only close an abandoned edit session.
      queueMicrotask(() => {
        if (editingId && activeEdit.current !== editingId) {
          try { endBulletinEdit(editingId); } catch { /* Storage can be disabled while editing. */ }
        }
      });
    };
  }, [editingId, reset, setError, router]);

  const navigate = (nextStep: number, nextView?: WeeklyView, group?: number) => {
    const params = new URLSearchParams({ step: String(nextStep) });
    if (editingId) params.set("bulletin", editingId);
    if (nextView && nextView !== "options") params.set("view", nextView);
    if (group !== undefined) params.set("group", String(group));
    window.history.pushState(null, "", `/weekly?${params}`);
  };
  const finishIntro = useCallback(() => window.history.replaceState(null, "", "/weekly?step=1"), []);
  const save = (close = false) => startTransition(async () => {
    clearErrors("root");
    // Paint the spinner before synchronous browser storage; replace this await with the API later.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const record = saveBulletin(getValues(), editingId);
      if (loadedLegacy.current) {
        localStorage.removeItem(legacyDraftKey);
        loadedLegacy.current = false;
      }
      toast("저장했어요", { position: "top-center", description: "이 브라우저에 저장됐어요" });
      if (close) {
        endBulletinEdit(record.id);
        router.push(bulletinHref(record.id));
      } else if (!editingId) {
        allowBulletinEdit(record.id);
        const params = new URLSearchParams(window.location.search);
        params.set("bulletin", record.id);
        window.history.replaceState(null, "", `/weekly?${params}`);
      }
    } catch (error) {
      const message = error instanceof DOMException ? "저장 공간이 부족해요. 사진 크기를 줄이거나 브라우저 저장 공간을 확인해 주세요" : error instanceof Error ? error.message : "저장하지 못했어요. 다시 시도해 주세요";
      setError("root", { message });
      toast.error(message, { position: "top-center" });
    }
  });
  const finishContent = () => navigate(3);
  const afterSermon = () => getValues("sections").includes("family") ? navigate(2, "families") : finishContent();
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
      else finishContent();
    } else if (view === "sermon") {
      if (await trigger(["sermon.date", "sermon.speaker", "sermon.title", "sermon.passage"])) navigate(2, "sermon-preview");
    } else if (view === "sermon-preview") { if (await trigger("sermon.document")) afterSermon(); }
    else if (view === "families") { if (await trigger("groups")) navigate(2, "family-preview"); }
    else if (view === "family-edit") {
      if (await trigger(`groups.${groupIndex}`)) navigate(2, "families");
    } else finishContent();
  };
  const back = () => {
    if (step === 1) router.push(editingId ? bulletinHref(editingId) : "/home");
    else if (step === 3) navigate(2);
    else if (view === "options") navigate(1);
    else if (view === "sermon") navigate(2);
    else if (view === "sermon-preview") navigate(2, "sermon");
    else if (view === "family-edit" || view === "family-preview") navigate(2, "families");
    else navigate(2);
  };
  const groupParam = Number(search.get("group") ?? 0);
  const groupIndex = Number.isInteger(groupParam) && groupParam >= 0 && groupParam < getValues("groups").length ? groupParam : 0;
  useEffect(() => { main.current?.scrollTo({ top: 0, behavior: "instant" }); }, [step, view, groupIndex]);
  const title = step === 3 ? "결과물 확인 및 추출" : view === "options" ? "어떤 구성으로 만들까요?" : view === "sermon" ? "설교 기본 정보" : view === "sermon-preview" ? "설교 정리 내용" : view === "family-preview" ? "새가족 문답 미리보기" : "새가족 문답 내용";

  if (search.get("intro") === "1") return <div className="home-theme fixed inset-0 z-40"><WorkIntro onComplete={finishIntro} /></div>;

  if (readyFor !== editingId) return <main className="flex min-h-svh flex-1 items-center justify-center gap-2"><Spinner />주보를 불러오는 중이에요</main>;

  return (
    <FormProvider {...methods}>
      <SermonPagesProvider>
      <main ref={main} className="weekly-main min-w-0 flex-1 pb-[100px]" style={{ "--weekly-sidebar-offset": isMobile ? "0px" : state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)" } as React.CSSProperties}>
      {step === 1 ? <PublishDate lockedDate={editingId ?? undefined} /> : (
        <>
          <WeeklyHeading step={step} title={title} description={step === 2 && (view === "options" || view === "family-preview") ? "해당되지 않는 것은 제외해 주세요" : undefined} />
          <div key={`${step}-${view}-${groupIndex}`} className="weekly-content weekly-page-enter">
            {step === 3 ? <WeeklyResults /> : view === "options" ? <Configuration /> : view === "sermon" || view === "sermon-preview" ? <SermonEditor preview={view === "sermon-preview"} /> : view === "families" ? <FamilyList onEdit={(index) => navigate(2, "family-edit", index)} /> : view === "family-edit" ? <FamilyEditor index={groupIndex} /> : <FamilyPreview onEdit={(index) => navigate(2, "family-edit", index)} />}
          </div>
          <div className="mx-auto max-w-[480px] px-4"><FieldError errors={[errors.root]} /></div>
        </>
      )}
      <WeeklyFooter onBack={back} onSave={() => save()} busy={pending} showSave={step !== 3} onNext={step !== 3 ? next : () => save(true)} nextLabel={step === 3 ? "저장" : "다음"} />
      </main>
      </SermonPagesProvider>
    </FormProvider>
  );
}
