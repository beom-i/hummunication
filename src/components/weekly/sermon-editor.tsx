"use client";

import { useState } from "react";
import Image from "next/image";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SermonCard } from "./preview-cards";
import type { WeeklyFormData } from "./schemas";

function SermonFields() {
  const { control, register, formState: { errors } } = useFormContext<WeeklyFormData>();
  return (
    <div className="flex w-full flex-col gap-5">
      <Field data-invalid={!!errors.sermon?.date} className="gap-2">
        <FieldLabel htmlFor="sermon-date" className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">설교 날짜</FieldLabel>
        <Controller control={control} name="sermon.date" render={({ field }) => <DatePicker id="sermon-date" name={field.name} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={!!errors.sermon?.date} />} />
        <FieldError errors={[errors.sermon?.date]} />
      </Field>
      {([{ name: "speaker", label: "설교자" }, { name: "title", label: "설교 제목" }, { name: "passage", label: "성경 본문" }] as const).map(({ name, label }) => (
        <Field key={name} data-invalid={!!errors.sermon?.[name]} className="gap-2">
          <FieldLabel htmlFor={`sermon-${name}`} className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">{label}</FieldLabel>
          <Input id={`sermon-${name}`} variant="filled" {...register(`sermon.${name}`)} aria-invalid={!!errors.sermon?.[name]} />
          <FieldError errors={[errors.sermon?.[name]]} />
        </Field>
      ))}
      <Field data-invalid={!!errors.sermon?.content} className="gap-2">
        <FieldLabel htmlFor="sermon-content" className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">정리 내용</FieldLabel>
        <Textarea id="sermon-content" variant="filled" className="min-h-[429px] text-[15px] leading-[1.7]" {...register("sermon.content")} aria-invalid={!!errors.sermon?.content} />
        <FieldError errors={[errors.sermon?.content]} />
      </Field>
    </div>
  );
}

export function SermonEditor({ preview }: { preview: boolean }) {
  const [page, setPage] = useState(0);
  return (
    <div className={preview ? "weekly-sermon-layout mt-[90px] flex items-start gap-8 max-lg:flex-col" : "weekly-centered mx-auto mt-[90px] w-full max-w-[438px] px-0 max-sm:px-5"}>
      <div className={preview ? "w-[380px] shrink-0 max-lg:w-full" : "w-full"}><SermonFields /></div>
      {preview && <section className="min-w-0 flex-1 rounded-3xl bg-card p-6 max-lg:w-full" aria-label="설교 카드뉴스 미리보기">
        <h2 className="text-lg font-bold tracking-[-0.72px]">카드뉴스 7장</h2>
        <Tabs defaultValue="album" className="mt-4">
          <TabsList variant="line" aria-label="보기 방식">
            <TabsTrigger value="album" className="gap-2"><Image src="/images/weekly/0f022.svg" alt="" width={16} height={16} />앨범형</TabsTrigger>
            <TabsTrigger value="list" className="gap-2"><Image src="/images/weekly/f42b6.svg" alt="" width={16} height={16} />목록형</TabsTrigger>
          </TabsList>
          <TabsContent value="album" className="mt-4 grid grid-cols-4 gap-x-4 gap-y-5 max-xl:grid-cols-3 max-sm:grid-cols-2">
            {Array.from({ length: 7 }, (_, index) => <figure key={index}><SermonCard index={index} /><figcaption className="mt-2 text-[13px] text-secondary-foreground">{index + 1}{index === 0 ? " 표지" : ""}</figcaption></figure>)}
          </TabsContent>
          <TabsContent value="list" className="mt-4">
            <div className="relative flex min-h-[420px] items-center justify-center rounded-[20px] bg-secondary/50 px-12 py-7">
              <Button variant="outline" size="icon" aria-label="이전 페이지" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="absolute left-3 rounded-full"><Image src="/images/weekly/6e9e8.svg" alt="" width={20} height={20} /></Button>
              <div className="w-full max-w-[300px]"><SermonCard index={page} /></div>
              <Button variant="outline" size="icon" aria-label="다음 페이지" disabled={page === 6} onClick={() => setPage((value) => value + 1)} className="absolute right-3 rounded-full"><Image src="/images/weekly/12acf.svg" alt="" width={20} height={20} /></Button>
            </div>
            <p className="mt-2 text-center text-sm text-secondary-foreground" aria-live="polite">{page + 1}/7</p>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 7 }, (_, index) => <button key={index} onClick={() => setPage(index)} aria-label={`${index + 1}페이지 보기`} aria-pressed={page === index} className={`w-14 shrink-0 rounded-md border-2 p-0.5 ${page === index ? "border-home-brand" : "border-transparent"}`}><SermonCard index={index} /></button>)}
            </div>
          </TabsContent>
        </Tabs>
      </section>}
    </div>
  );
}
