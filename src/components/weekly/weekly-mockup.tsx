"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WorkIntro } from "@/components/home/work-intro";
import { PublishDate } from "./publish-date";
import { useSidebar } from "@/components/ui/sidebar";
import { FieldError } from "@/components/ui/field";
import { WeeklyHeading, WeeklyFooter } from "./weekly-layout";
import { Configuration } from "./configuration";
import { SermonEditor } from "./sermon-editor";
import { FamilyList, FamilyEditor, FamilyPreview } from "./family-editor";
import { WeeklyResults } from "./weekly-results";
import { weeklyDefaultValues, weeklyDraftSchema, weeklySchema, type WeeklyFormData } from "./schemas";

export const weeklyDraftKey = "hummunication.weekly-draft";
const views = ["options", "sermon", "sermon-preview", "families", "family-edit", "family-preview"] as const;
export type WeeklyView = typeof views[number];

export function WeeklyMockup() {
  const search = useSearchParams();
  const router = useRouter();
  const { setOpen, state, isMobile } = useSidebar();
  const main = useRef<HTMLElement>(null);
  const [pending, startTransition] = useTransition();
  const rawStep = search.get("step");
  const step = rawStep === "3" ? 3 : rawStep === "2" || rawStep === "2-1" ? 2 : 1;
  const rawView = rawStep === "2-1" ? "sermon" : search.get("view");
  const view: WeeklyView = views.find((value) => value === rawView) ?? "options";
  const methods = useForm<WeeklyFormData>({ resolver: zodResolver(weeklySchema), defaultValues: weeklyDefaultValues });
  const { reset, setError, getValues, trigger, formState: { errors } } = methods;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(weeklyDraftKey);
      if (!saved) return;
      const result = weeklyDraftSchema.safeParse(JSON.parse(saved));
      if (result.success) reset(result.data);
    } catch { setError("root", { message: "브라우저 저장 공간을 확인해 주세요" }); }
  }, [reset, setError]);

  const navigate = (nextStep: number, nextView?: WeeklyView, group?: number) => {
    const params = new URLSearchParams({ step: String(nextStep) });
    if (nextView && nextView !== "options") params.set("view", nextView);
    if (group !== undefined) params.set("group", String(group));
    window.history.pushState(null, "", `/weekly?${params}`);
  };
  const finishIntro = useCallback(() => window.history.replaceState(null, "", "/weekly?step=1"), []);
  const saveDraft = () => {
    try {
      localStorage.setItem(weeklyDraftKey, JSON.stringify(getValues()));
      toast("임시저장했어요", { description: "이 브라우저에서 이어서 작업할 수 있어요" });
      return true;
    } catch {
      setError("root", { message: "저장 공간이 부족해요. 사진 크기를 줄이거나 브라우저 저장 공간을 확인해 주세요" });
      return false;
    }
  };
  const finishContent = () => navigate(3);
  const afterSermon = () => getValues("sections").includes("family") ? navigate(2, "families") : finishContent();
  const next = async () => {
    const sections = getValues("sections");
    if (view === "options") {
      if (!await trigger("sections")) return;
      if (sections.includes("sermon")) navigate(2, "sermon");
      else if (sections.includes("family")) navigate(2, "families");
      else finishContent();
    } else if (view === "sermon") {
      if (await trigger("sermon")) navigate(2, "sermon-preview");
    } else if (view === "sermon-preview") afterSermon();
    else if (view === "families") { if (await trigger("groups")) navigate(2, "family-preview"); }
    else if (view === "family-edit") {
      if (await trigger(`groups.${groupIndex}`)) navigate(2, "families");
    } else finishContent();
  };
  const back = () => {
    if (step === 3) navigate(2);
    else if (view === "options") navigate(1);
    else if (view === "sermon") navigate(2);
    else if (view === "sermon-preview") navigate(2, "sermon");
    else if (view === "family-edit" || view === "family-preview") navigate(2, "families");
    else navigate(2);
  };
  const groupParam = Number(search.get("group") ?? 0);
  const groupIndex = Number.isInteger(groupParam) && groupParam >= 0 && groupParam < getValues("groups").length ? groupParam : 0;
  useEffect(() => { main.current?.scrollTo({ top: 0, behavior: "instant" }); }, [step, view, groupIndex]);
  const title = step === 3 ? "결과물 확인 및 추출" : view === "options" ? "어떤 구성으로 만들까요?" : view === "sermon" ? "설교 정리 내용" : view === "sermon-preview" ? "설교 정리본 미리보기" : view === "family-preview" ? "새가족 문답 미리보기" : "새가족 문답 내용";

  if (search.get("intro") === "1") return <div className="home-theme fixed inset-0 z-40"><WorkIntro onComplete={finishIntro} /></div>;

  return (
    <FormProvider {...methods}>
      <main ref={main} className={`weekly-main min-w-0 flex-1 ${step > 1 ? "pb-[100px]" : ""}`} style={{ "--weekly-sidebar-offset": isMobile ? "0px" : state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)" } as React.CSSProperties}>
      {step === 1 ? <PublishDate onNext={() => { methods.setValue("sermon.date", getValues("date")); navigate(2); }} onSave={saveDraft} /> : (
        <>
          <WeeklyHeading step={step} title={title} description={step === 2 && (view === "options" || view === "family-preview") ? "해당되지 않는 것은 제외해 주세요" : undefined} />
          <div key={`${step}-${view}-${groupIndex}`} className="weekly-content weekly-page-enter">
            {step === 3 ? <WeeklyResults /> : view === "options" ? <Configuration /> : view === "sermon" || view === "sermon-preview" ? <SermonEditor preview={view === "sermon-preview"} /> : view === "families" ? <FamilyList onEdit={(index) => navigate(2, "family-edit", index)} /> : view === "family-edit" ? <FamilyEditor index={groupIndex} /> : <FamilyPreview onEdit={(index) => navigate(2, "family-edit", index)} />}
          </div>
          <div className="mx-auto max-w-[480px] px-4"><FieldError errors={[errors.root]} /></div>
          <WeeklyFooter onBack={back} onSave={saveDraft} busy={pending} onNext={step !== 3 ? next : () => startTransition(async () => {
            // Paint the busy state before local storage work; await the API here when connected.
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            if (!saveDraft()) return;
            setOpen(true);
            router.push("/home");
          })} nextLabel={step === 3 ? "완료" : "다음"} />
        </>
      )}
      </main>
    </FormProvider>
  );
}
