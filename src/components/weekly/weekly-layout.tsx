import Image from "next/image";
import { Button } from "@/components/ui/button";

export function WeeklySteps({ step }: { step: number }) {
  return (
    <ol aria-label="주보 만들기 진행 단계" className="flex h-7 items-center gap-[9px]">
      {[1, 2, 3].map((value) => (
        <li key={value} className="flex items-center gap-[9px]" aria-current={value === step ? "step" : undefined}>
          {value > 1 && <Image src="/images/home/step-connector.svg" alt="" width={30} height={4} />}
          <span className={`flex size-7 items-center justify-center rounded-full ${value === step ? "bg-home-brand/30" : "bg-step-halo"}`}>
            <span className={`flex size-[22px] items-center justify-center rounded-full text-[13px] leading-4 font-black tracking-[-1.04px] ${value === step ? "bg-home-brand text-foreground" : "bg-input text-muted-foreground"}`}>{value}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function WeeklyHeading({ step, title, description }: { step: number; title: React.ReactNode; description?: string }) {
  return (
    <header className="weekly-heading flex flex-col items-center px-5 pt-[99px] text-center max-md:pt-20">
      <WeeklySteps step={step} />
      <h1 key={String(title)} tabIndex={-1} className="weekly-enter mt-[62px] text-[36px] leading-[1.25] font-extrabold tracking-[-2.88px] outline-none max-md:mt-10 max-sm:text-[28px] max-sm:tracking-[-2px]">{title}</h1>
      {description && <p className="mt-3 text-base leading-5 tracking-[-1.28px] text-muted-foreground">{description}</p>}
    </header>
  );
}

export function WeeklyFooter({ onBack, onSave, onNext, nextLabel = "다음", busy = false }: { onBack: () => void; onSave: () => void; onNext: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <footer className="weekly-footer sticky bottom-0 z-20 flex min-h-20 items-center gap-3 border-t border-border bg-card px-10 py-4 max-sm:px-4">
      <Button variant="ghost" disabled={busy} onClick={onBack} className="mr-auto gap-1 text-base text-secondary-foreground"><Image src="/images/weekly/33936.svg" alt="" width={20} height={21} />이전</Button>
      <Button variant="secondary" disabled={busy} size="workflow" onClick={onSave}>임시저장</Button>
      <Button size="workflow" loading={busy} onClick={onNext} className="w-[156px] px-4 max-sm:w-[100px]">{nextLabel}</Button>
    </footer>
  );
}
