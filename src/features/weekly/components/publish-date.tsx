"use client";

import { bulletinTitle } from "@/features/bulletins/utils/format";
import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { WeeklyFormData } from "../schemas";
import { upcomingPublishDates } from "../utils/publish-dates";

export function PublishDate({ lockedDate }: { lockedDate?: string }) {
  const { register, control, formState: { errors } } = useFormContext<WeeklyFormData>();
  const selected = useWatch({ control, name: "date" });
  let dates = upcomingPublishDates();
  if (lockedDate) dates = [lockedDate];
  else if (selected && !dates.includes(selected)) dates = [selected, ...dates];
  const options = dates.map(value => ({ value, label: `${Number(value.slice(5, 7))}월 ${Number(value.slice(-2))}일${lockedDate ? "" : " (주일)"}`, week: bulletinTitle(value).replace(" 주보", "") }));

  return (
    <section className="mx-auto mt-[62px] w-full max-w-[528px] px-6 max-md:mt-12">
        <fieldset className="w-full">
          <legend className="sr-only">주보 발행 날짜</legend>
          <FieldGroup className="gap-4">
            {options.map((option) => (
              <Field key={option.value} className="relative">
                <input type="radio" value={option.value} id={option.value} {...register("date")} className="peer sr-only" />
                <FieldLabel htmlFor={option.value} className="flex min-h-[63px] cursor-pointer items-center gap-2 rounded-2xl border bg-card py-[18px] pr-4 pl-5 peer-checked:min-h-16 peer-checked:border-selection-border peer-checked:bg-home-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
                  <span className="text-[18px] leading-[25px] font-semibold tracking-[-0.36px] group-has-checked/field:font-extrabold max-sm:text-base">{option.label}</span>
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
