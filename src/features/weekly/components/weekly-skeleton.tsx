import { Skeleton } from "@/components/ui/skeleton";
import { ContentEditorLayout } from "./content-editor-layout";
import { WeeklySteps } from "./weekly-layout";
import { weeklyIndicatorStep, weeklySkeletonView, type WeeklyView } from "../utils/workflow";

function Fields({ count = 4 }: { count?: number }) {
  return <div className="flex flex-col gap-5">{Array.from({ length: count }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-[52px] w-full rounded-xl" /></div>)}</div>;
}

function Cards({ count = 4 }: { count?: number }) {
  return <div className="sermon-preview-grid">{Array.from({ length: count }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-[4/5] w-full rounded-[14px]" /><Skeleton className="h-3 w-10" /></div>)}</div>;
}

export function SermonPreviewSkeleton() {
  return <div className="weekly-step-skeleton space-y-5" aria-hidden="true"><Skeleton className="h-5 w-28" /><div className="flex gap-4 border-b pb-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div><Cards /></div>;
}

function FamilyFormSkeleton() {
  return <div className="family-form-card space-y-6"><Fields count={1} /><Skeleton className="h-4 w-20" /><Skeleton className="h-[256px] w-full rounded-2xl" /><Fields count={2} /></div>;
}

export function WeeklyStepSkeleton({ step = 1, view = "options" }: { step?: number; view?: WeeklyView }) {
  let content;
  if (step === 1) content = <div className="mx-auto mt-[62px] max-w-[528px] space-y-4 px-6 max-md:mt-12">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>;
  else if (step === 3) content = <div className="weekly-centered mx-auto mt-[60px] max-w-[1200px] space-y-10"><Skeleton className="h-[382px] w-full rounded-3xl" /><div className="flex flex-wrap gap-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-24 rounded-full" />)}</div><div className="grid grid-cols-5 gap-5 max-xl:grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="aspect-[4/5] rounded-xl" />)}</div></div>;
  else if (view === "options") content = <div className="mx-auto mt-[60px] w-full max-w-[680px] max-sm:mt-10 max-sm:px-5"><Skeleton className="h-[300px] rounded-3xl" /><div className="mt-6 flex justify-between gap-2 px-[18px] max-sm:px-0">{Array.from({ length: 5 }, (_, index) => <div key={index} className="w-24 space-y-3 max-sm:w-[18%]"><Skeleton className="aspect-square w-full rounded-full" /><Skeleton className="mx-auto h-3 w-3/4" /></div>)}</div></div>;
  else if (view === "sermon" || view === "sermon-preview") content = <ContentEditorLayout preview={<div className="weekly-preview-panel">{view === "sermon-preview" ? <SermonPreviewSkeleton /> : <><Skeleton className="mb-4 h-5 w-24" /><div className="weekly-preview-stage px-6 py-7"><Skeleton className="mx-auto aspect-[4/5] w-full max-w-[300px] rounded-2xl" /><Skeleton className="mx-auto mt-3 h-7 w-12 rounded-full" /></div></>}</div>}>
    {view === "sermon" ? <><Fields /><Skeleton className="mt-5 h-[213px] rounded-2xl" /></> : <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-[538px] rounded-2xl" /></div>}
  </ContentEditorLayout>;
  else if (view === "families" || view === "senders") content = <div className="mx-auto mt-[60px] w-full max-w-[438px] space-y-5 max-sm:px-5"><div className="space-y-5 rounded-[30px] border bg-card p-[15px]"><Skeleton className="h-36 rounded-2xl" /><div className="flex items-center gap-3 px-3"><Skeleton className="size-6 rounded-full" /><Skeleton className="h-5 w-20" /><Skeleton className="ml-auto h-[38px] w-28 rounded-full" /></div></div><Skeleton className="mx-auto h-[59px] w-48 rounded-full" /></div>;
  else content = <ContentEditorLayout preview={<div className="weekly-preview-panel"><Skeleton className="mb-4 h-5 w-28" /><div className="weekly-preview-stage px-6 py-7"><Skeleton className="mx-auto aspect-[4/5] w-full max-w-[300px] rounded-2xl" /><Skeleton className="mx-auto mt-3 h-7 w-12 rounded-full" /></div></div>}>
    {view === "family-card-edit" ? <FamilyFormSkeleton /> : <div className="family-form-card space-y-6"><Fields /><Skeleton className="h-40 rounded-xl" /></div>}
  </ContentEditorLayout>;
  return <div className="weekly-step-skeleton" data-skeleton-view={weeklySkeletonView(step, view)} aria-hidden="true">{content}</div>;
}

export function WeeklyLoadingScreen({ step = 1, view = "options" }: { step?: number; view?: WeeklyView }) {
  const current = weeklyIndicatorStep(step, view);
  return <main className="weekly-main weekly-workspace min-w-0 flex-1 pb-[100px]" aria-busy="true" role="status" aria-label="주보 화면 불러오는 중">
    <div className="progress-sidebar" aria-hidden="true"><div className="progress-toggle"><Skeleton className="h-5 w-32" /></div><div className="progress-collapse"><ol className="progress-list">{Array.from({ length: 3 }, (_, index) => <li key={index}><div className="progress-step"><Skeleton className="size-7 rounded-full" /><Skeleton className="h-4 w-24" /></div>{index < 2 && index + 1 === current && <div className="progress-substeps">{Array.from({ length: 2 }, (_, sub) => <div key={sub} className="progress-substep"><Skeleton className="h-[13px] w-[76px]" /></div>)}</div>}</li>)}</ol></div></div>
    <header className="weekly-heading flex flex-col items-center px-5 pt-[99px] max-md:pt-20" aria-hidden="true"><WeeklySteps step={current} /><div className="mt-10 flex flex-col items-center"><div className={`flex flex-col items-center justify-center gap-3 ${step === 3 ? "h-[45px] max-sm:h-[35px]" : "h-[90px] max-sm:h-[70px]"}`}><Skeleton className="h-8 w-72 max-sm:h-7 max-sm:w-60" />{step !== 3 && <Skeleton className="h-8 w-48 max-sm:h-7" />}</div>{step === 1 && <Skeleton className="mt-3 h-[18px] w-64" />}</div></header>
    <WeeklyStepSkeleton step={step} view={view} />
  </main>;
}
