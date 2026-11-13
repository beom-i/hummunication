import Link from "next/link";
import type { FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { bulletinHref } from "@/features/bulletins/utils/format";
import type { WeeklyFormData } from "../schemas";
import { weeklyErrorMessages } from "../utils/form-feedback";

export function WeeklyFormErrors({ errors, date }: { errors: FieldErrors<WeeklyFormData>; date: string }) {
  const messages = weeklyErrorMessages(errors);
  if (!messages.length) return null;
  return <section id="weekly-form-errors" role="alert" aria-label="입력·저장 오류" className="mx-auto mb-3 w-full max-w-[1200px] rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
    <ul className="max-h-28 space-y-1 overflow-y-auto">{messages.map(({ path, label, message }) => <li key={path}>{label && <strong className="font-semibold">{label}: </strong>}{message}</li>)}</ul>
    {errors.root?.type === "CONFLICT" && errors.date && <Button asChild variant="link" className="mt-2 h-auto p-0"><Link target="_blank" rel="noreferrer" href={bulletinHref(date)}>저장된 주보 열기</Link></Button>}
  </section>;
}
