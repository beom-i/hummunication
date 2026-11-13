import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyStepSkeleton } from "@/features/weekly/components/weekly-skeleton";

export function BulletinDetailSkeleton() {
  return <main className="weekly-main min-w-0 flex-1 px-6 pt-16 pb-[100px] max-sm:px-4" aria-busy="true" role="status" aria-label="주보 상세 불러오는 중">
    <header className="mx-auto w-full max-w-[1200px]" aria-hidden="true">
      <Skeleton className="mb-6 h-9 w-24 rounded-lg" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-60" /><Skeleton className="h-4 w-72 max-sm:w-60" /></div>
        <div className="flex gap-2"><Skeleton className="h-10 w-20 rounded-xl" /><Skeleton className="h-10 w-20 rounded-xl" /></div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-5 rounded-2xl border bg-card p-5 max-sm:grid-cols-1">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-40" /></div>)}</div>
    </header>
    <WeeklyStepSkeleton step={3} />
  </main>;
}
