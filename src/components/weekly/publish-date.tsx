"use client";

import { bulletinTitle } from "@/components/bulletins/format";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { WeeklyFormData } from "@/components/weekly/schemas";

// shortcut: Figma의 고정 날짜를 사용하며, 실제 발행 연결 시 주일 목록으로 교체한다.
const publishDates = [
  { value: "2026-11-08", label: "11월 8일 (주일)", week: "11월 둘째주" },
  { value: "2026-11-15", label: "11월 15일 (주일)", week: "11월 셋째주" },
  { value: "2026-11-22", label: "11월 22일 (주일)", week: "11월 넷째주" },
  { value: "2026-11-29", label: "11월 29일 (주일)", week: "11월 다섯째주" },
] as const;

export function PublishDate({ lockedDate }: { lockedDate?: string }) {
  const options = lockedDate ? [{ value: lockedDate, label: `${Number(lockedDate.slice(5, 7))}월 ${Number(lockedDate.slice(-2))}일`, week: bulletinTitle(lockedDate).replace(" 주보", "") }] : publishDates;
  const { register, formState: { errors } } = useFormContext<WeeklyFormData>();

  return (
    <section className="mx-auto mt-[62px] w-full max-w-[528px] px-6 max-md:mt-12">
        <fieldset className="w-full">
          <legend className="sr-only">주보 발행 날짜</legend>
          <FieldGroup className="gap-4">
            {options.map((option) => (
              <Field key={option.value} className="relative">
                <input type="radio" value={option.value} id={option.value} {...register("date")} className="peer sr-only" />
                <FieldLabel htmlFor={option.value} className="flex min-h-[63px] cursor-pointer items-center gap-2 rounded-2xl border bg-card py-[18px] pr-4 pl-5 peer-checked:min-h-16 peer-checked:border-selection-border peer-checked:bg-home-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
                  <span className="text-xl leading-[25px] font-semibold tracking-[-0.4px] group-has-checked/field:font-extrabold max-sm:text-base">{option.label}</span>
                  <span className="ml-auto text-base leading-5 font-normal tracking-[-0.64px] text-muted-foreground group-has-checked/field:text-foreground max-sm:text-[13px]">{option.week}</span>
                  <Image src="/images/home/date-check.svg" alt="" width={24} height={24} className="hidden shrink-0 group-has-checked/field:block" />
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
          <FieldError errors={[errors.date]} />
        </fieldset>
        <FieldError errors={[errors.root]} />
    </section>
  );
}
