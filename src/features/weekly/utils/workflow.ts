import type { WeeklyFormData } from "../schemas";

const views = ["options", "sermon", "sermon-preview", "families", "family-card-edit", "senders", "sender-edit"] as const;
export type WeeklyView = typeof views[number];
export type WeeklyNavigate = (step: number, view?: WeeklyView, group?: number, card?: number) => void;

export function weeklyLocation(search: Pick<URLSearchParams, "get">) {
  const rawStep = search.get("step");
  let step = 1;
  if (rawStep === "3") step = 3;
  else if (rawStep === "2" || rawStep === "2-1") step = 2;
  let rawView = rawStep === "2-1" ? "sermon" : search.get("view");
  if (rawView === "family-edit") rawView = "family-card-edit";
  if (rawView === "family-preview") rawView = "families";
  const view: WeeklyView = views.find(value => value === rawView) ?? "options";
  return { step, view };
}

export function weeklyHref(step: number, view: WeeklyView = "options", editingId?: string | null, group?: number, card?: number) {
  const params = new URLSearchParams({ step: String(step) });
  if (editingId) params.set("bulletin", editingId);
  if (view !== "options") params.set("view", view);
  if (group !== undefined) params.set("group", String(group));
  if (card !== undefined) params.set("card", String(card));
  return `/weekly?${params}`;
}

export function weeklyIndicatorStep(step: number, view: WeeklyView) {
  if (step === 3) return 3;
  if (step === 1 || view === "options") return 1;
  return 2;
}

export function firstContentView(sections: WeeklyFormData["sections"]): WeeklyView {
  if (sections.includes("sermon")) return "sermon";
  if (sections.includes("family")) return "families";
  if (sections.includes("senders")) return "senders";
  return "options";
}

export function weeklyHeading(step: number, view: WeeklyView, editing: boolean) {
  if (step === 1) {
    const action = editing ? "확인해 주세요" : "선택해 주세요";
    const description = editing ? "저장된 주보의 발행일이에요" : "발행일(주일) 기준으로 주차가 자동 계산돼요";
    return { title: `주보 발행 날짜를\n${action}`, description };
  }
  if (step === 3) return { title: "결과물 확인 및 추출" };
  if (view === "options") return { title: "작업할 카드뉴스 유형을\n선택해 주세요" };
  if (view.startsWith("sermon")) return { title: "설교 정리본 내용을\n입력해 주세요" };
  if (view.startsWith("sender")) return { title: "파송자 내용을\n입력해 주세요" };
  return { title: "새가족 문답 내용을\n입력해 주세요" };
}

export function weeklySkeletonView(step: number, view: WeeklyView) {
  if (step === 1) return "date";
  if (step === 3) return "results";
  return view;
}

export function boundedEntryIndex(value: string | null, count: number) {
  const index = Number(value ?? 0);
  if (Number.isInteger(index) && index >= 0 && index < count) return index;
  return 0;
}
