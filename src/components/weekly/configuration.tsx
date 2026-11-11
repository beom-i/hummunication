"use client";

import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { sectionOptions, type WeeklyFormData } from "./schemas";

export function Configuration() {
  const { register, formState: { errors } } = useFormContext<WeeklyFormData>();
  return (
    <fieldset className="weekly-centered mx-auto mt-[42px] w-full max-w-[496px] px-0 max-sm:px-5">
      <legend className="sr-only">주보 구성 선택</legend>
      <div className="grid grid-cols-2 gap-4">
        {sectionOptions.map(({ value, label }) => (
          <Field key={value} className="relative">
            <input id={`section-${value}`} type="checkbox" value={value} {...register("sections")} className="peer sr-only" />
            <FieldLabel htmlFor={`section-${value}`} className="relative flex aspect-square cursor-pointer items-center justify-center rounded-2xl border bg-card text-center text-xl font-bold tracking-[-0.4px] transition-colors peer-checked:border-2 peer-checked:border-home-brand peer-checked:bg-home-brand/16 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring max-sm:text-base">
              {label}
              <span className="absolute top-3 right-3 hidden size-[30px] items-center justify-center rounded-full bg-home-brand group-has-checked/field:flex"><Image src="/images/weekly/7cebd.svg" alt="선택됨" width={24} height={24} /></span>
            </FieldLabel>
          </Field>
        ))}
      </div>
      <FieldError errors={[errors.sections]} />
    </fieldset>
  );
}
