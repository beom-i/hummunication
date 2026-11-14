import Link from "next/link";
import type { FieldErrors } from "react-hook-form";
import { bulletinHref } from "@/features/bulletins/utils/format";
import type { WeeklyFormData } from "../schemas";
import { weeklyErrorMessages } from "../utils/form-feedback";

export function WeeklyFormErrors({ errors, date }: { errors: FieldErrors<WeeklyFormData>; date: string }) {
  const messages = weeklyErrorMessages(errors);
  if (!messages.length) return null;
  return <section id="weekly-form-errors" role="alert" aria-label="입력·저장 오류" className="ml-6 w-max min-w-0 max-w-[600px] shrink text-[13px] leading-[19px] text-destructive max-sm:ml-0 max-sm:flex-1 max-sm:text-[11px] max-sm:leading-[15px]">
    <ul className="space-y-0.5">{messages.map(({ path, label, message }) => <li key={path}>
      <span title={message} className="block truncate max-sm:line-clamp-2 max-sm:whitespace-normal">{label && <strong className="font-semibold">{label}: </strong>}{message}</span>
      {path === "root" && errors.root?.type === "CONFLICT" && errors.date && <Link target="_blank" rel="noreferrer" href={bulletinHref(date)} className="underline underline-offset-2">저장된 주보 열기</Link>}
    </li>)}</ul>
  </section>;
}
