"use client";

import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";
import { weeklyIndicatorStep, firstContentView, type WeeklyView } from "../utils/workflow";
import { cn } from "@/lib/utils";

export function ProgressSidebar({ step, view, open, onToggle, onNavigate, loading = false }: {
  step: number; view: WeeklyView; open: boolean; onToggle: () => void;
  onNavigate: (step: number, view?: WeeklyView) => void;
  loading?: boolean;
}) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  const sections = useWatch({ control, name: "sections" });
  const current = weeklyIndicatorStep(step, view);
  const labels = ["기본 정보", "유형 작업", "결과물 확인"];
  const title = `${Number(date.slice(5, 7))}월 ${Math.ceil(Number(date.slice(-2)) / 7)}주차 주보`;
  const circle = (value: number) => <span className={cn("progress-circle", { "is-current": value === current, "is-done": value < current })}>{value < current ? <Check className="size-3.5" /> : value}</span>;
  const sub = (label: string, nextStep: number, nextView: WeeklyView, active: boolean) => <button type="button" key={label} disabled={loading} onClick={() => onNavigate(nextStep, nextView)} aria-label={label} aria-current={active ? "step" : undefined} className={`progress-substep ${active ? "is-active" : ""}`}><span className="progress-substep-label">{label}</span><Skeleton className="progress-substep-placeholder" /></button>;
  return <aside className="progress-sidebar" aria-label="주보 제작 진행 단계" data-open={open} data-loading={loading} aria-busy={loading}>
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="weekly-progress" className="progress-toggle" aria-label={`${title} · 진행 단계 ${open ? "접기" : "펼치기"}`}>
      <span className="progress-toggle-title" aria-hidden="true">{title}</span>
      <span className="progress-toggle-current" aria-hidden="true">{circle(current)}<span>{labels[current - 1]}</span></span>
    </button>
    <div id="weekly-progress" className="progress-collapse" inert={!open}>
      <ol className="progress-list">
        {labels.map((label, index) => <li key={label}>
          <button type="button" className={`progress-step ${index + 1 <= current ? "is-active" : ""}`} onClick={() => onNavigate(index + 1, index === 1 ? firstContentView(sections) : "options")} aria-current={index + 1 === current ? "step" : undefined}>{circle(index + 1)}<span>{label}</span></button>
          {index < 2 && <div className="progress-substep-collapse" data-expanded={index + 1 === current} inert={index + 1 !== current}>
            <div className="progress-substep-clip"><div className="progress-substeps">
              {index === 0 ? <>
                {sub("날짜 선택", 1, "options", step === 1)}
                {sub("유형 선택", 2, "options", step === 2 && view === "options")}
              </> : <>
                {sections.includes("sermon") && sub("설교 정리", 2, "sermon", view.startsWith("sermon"))}
                {sections.includes("family") && sub("새가족 문답", 2, "families", view.startsWith("famil"))}
                {sections.includes("senders") && sub("파송자", 2, "senders", view.startsWith("sender"))}
              </>}
            </div></div>
          </div>}
        </li>)}
      </ol>
    </div>
  </aside>;
}
