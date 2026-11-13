"use client";

import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { sectionOptions, type WeeklyFormData } from "../schemas";
import { BulletinCard } from "@/features/weekly/templates/bulletin-card";
import { FamilyCard } from "@/features/weekly/templates/family-card";
import { SermonCard } from "@/features/weekly/templates/sermon-card";
import { SenderCard } from "../templates/sender-card";

export function Configuration() {
  const { control, register } = useFormContext<WeeklyFormData>();
  const selected = useWatch({ control, name: "sections" });
  const cards = [<BulletinCard key="thumbnail" artwork />, <BulletinCard key="cover" cover />, <SermonCard key="sermon" index={0} />, <FamilyCard key="family" index={0} />, <SenderCard key="senders" index={0} />];
  return (
    <fieldset className="type-picker mx-auto mt-[60px] w-full max-w-[680px] px-0 max-sm:px-5">
      <legend className="sr-only">주보 구성 선택</legend>
      <div className="type-collage relative h-[300px] overflow-hidden rounded-3xl bg-export-hero text-hero-foreground">
        <p className="absolute top-5 left-6 text-lg font-bold">이번 주 결과물 5종</p>
        <div className="type-collage-stage" data-introducing="true" data-empty={!selected.length} aria-hidden="true">
          {sectionOptions.map(({ value }, index) => <div key={value} className="type-collage-slot" style={{ "--card-order": index, "--card-rotation": `${(index - 2) * 5}deg` } as React.CSSProperties}><div className="type-collage-card" data-selected={selected.includes(value)}>{cards[index]}</div></div>)}
        </div>
        {!selected.length && <p className="weekly-enter absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">작업할 카드뉴스 유형을 선택해 주세요</p>}
      </div>
      <div className="mt-6 flex justify-between gap-2 px-[18px] max-sm:px-0">
        {sectionOptions.map(({ value, label }, index) => (
          <Field key={value} className="type-option relative w-24 gap-0">
            <input id={`section-${value}`} type="checkbox" value={value} {...register("sections")} className="peer sr-only" />
            <FieldLabel htmlFor={`section-${value}`} className="flex cursor-pointer flex-col items-center gap-[10px] text-center text-sm font-bold tracking-[-0.42px]">
              <span className="type-ring relative block size-24 rounded-full border-[3px] border-transparent p-[3px] transition-colors group-has-checked/field:border-home-brand">
                <span className="type-story block size-full overflow-hidden rounded-full bg-secondary">{cards[index]}</span>
                <span className="absolute -right-0.5 -bottom-0.5 flex size-7 scale-0 items-center justify-center rounded-full border-2 border-card bg-home-brand transition-transform group-has-checked/field:scale-100"><Image src="/images/weekly/7cebd.svg" alt="" width={16} height={16} /></span>
              </span>
              <span>{label}</span>
            </FieldLabel>
          </Field>
        ))}
      </div>
    </fieldset>
  );
}
