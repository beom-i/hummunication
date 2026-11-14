"use client";

import { bulletinTitle } from "@/features/bulletins/utils/format";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { WeeklyFormData } from "../schemas";
import { upcomingPublishDates } from "../utils/publish-dates";

export function PublishDate({ lockedDate }: { lockedDate?: string }) {
  const { register, formState: { errors } } = useFormContext<WeeklyFormData>();
  let dates = upcomingPublishDates();
  if (lockedDate) dates = [lockedDate];
  const options = dates.map(value => ({ value, label: `${Number(value.slice(5, 7))}월 ${Number(value.slice(-2))}일${lockedDate ? "" : " (주일)"}`, week: bulletinTitle(value).replace(" 주보", "") }));

  return (
    <section className="mx-auto mt-[62px] w-full max-w-[528px] px-6 max-md:mt-12">
        <fieldset className="w-full" aria-invalid={!!errors.date} aria-describedby={errors.date ? "weekly-form-errors" : undefined}>
          <legend className="sr-only">주보 발행 날짜</legend>
          <FieldGroup className="gap-4">
            {options.map((option) => (
              <Field key={option.value} className="publish-date-option relative" onPointerLeave={event => { event.currentTarget.querySelector("[data-settled]")?.removeAttribute("data-settled"); }}>
                <input type="radio" value={option.value} id={option.value} {...register("date")} className="peer sr-only" onClick={event => {
                  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                  const card = event.currentTarget.labels![0];
                  card.dataset.settled = "true";
                  for (const animation of card.getAnimations()) if (animation.id === "publish-date-bounce") animation.cancel();
                  card.animate([{ scale: ".965", easing: "cubic-bezier(.2, .8, .2, 1)" }, { scale: "1.024", offset: .55, easing: "ease-in-out" }, { scale: ".996", offset: .8, easing: "ease-out" }, { scale: "1" }], { id: "publish-date-bounce", duration: 520 });
                }} />
                <FieldLabel htmlFor={option.value} className="publish-date-card flex min-h-16 cursor-pointer items-center gap-2 rounded-2xl border bg-card py-[18px] pr-4 pl-5 peer-checked:border-selection-border peer-checked:bg-home-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
                  <span className="text-[18px] leading-[25px] font-semibold tracking-[-0.36px] group-has-checked/field:font-extrabold max-sm:text-base">{option.label}</span>
                  <span className="ml-auto text-base leading-5 font-normal tracking-[-0.64px] text-muted-foreground transition-colors duration-300 group-has-checked/field:text-foreground max-sm:text-[13px]">{option.week}</span>
                  <Image src="/images/home/date-check.svg" alt="" width={24} height={24} className="publish-date-check shrink-0" />
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        </fieldset>
    </section>
  );
}
