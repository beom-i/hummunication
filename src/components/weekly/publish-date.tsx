"use client";

import { bulletinTitle } from "@/components/bulletins/format";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { WeeklyFormData } from "@/components/weekly/schemas";
import { WeeklySteps } from "@/components/weekly/weekly-layout";

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
    <section className="weekly-enter flex min-w-0 flex-1 flex-col items-center px-6 pt-[99px] pb-8 max-md:pt-20">
      <div className="flex w-full max-w-[480px] flex-1 flex-col items-center">
        <WeeklySteps step={1} />
        <div className="mt-[62px] w-full text-center max-md:mt-10">
          <h1 className="text-[36px] leading-[1.25] font-extrabold tracking-[-2.88px] max-sm:text-[30px]">주보 발행 날짜를<br />{lockedDate ? "확인해 주세요" : "선택해 주세요"}</h1>
          <p className="mt-3 text-sm leading-[18px] tracking-[-1.12px] text-muted-foreground">{lockedDate ? "저장된 주보의 발행일이에요" : "발행일(주일) 기준으로 주차가 자동 계산돼요"}</p>
        </div>
        <fieldset className="mt-[82px] w-full max-md:mt-12">
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
      </div>
    </section>
  );
}
