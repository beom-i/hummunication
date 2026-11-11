"use client";

import { useState } from "react";
import Image from "next/image";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { richDocumentSchema } from "@/components/ui/rich-text-editor/schemas";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SermonCard } from "./preview-cards";
import { useSermonPages } from "./sermon-pagination";
import type { WeeklyFormData } from "./schemas";

function SermonFields() {
  const { control, register, formState: { errors } } = useFormContext<WeeklyFormData>();
  return <div className="flex w-full flex-col gap-5">
    <Field data-invalid={!!errors.sermon?.date} className="gap-2">
      <FieldLabel htmlFor="sermon-date" className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">설교 날짜</FieldLabel>
      <Controller control={control} name="sermon.date" render={({ field }) => <DatePicker id="sermon-date" name={field.name} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={!!errors.sermon?.date} />} />
      <FieldError errors={[errors.sermon?.date]} />
    </Field>
    {([{ name: "speaker", label: "설교자" }, { name: "title", label: "설교 제목" }, { name: "passage", label: "성경 본문" }] as const).map(({ name, label }) => <Field key={name} data-invalid={!!errors.sermon?.[name]} className="gap-2">
      <FieldLabel htmlFor={`sermon-${name}`} className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">{label}</FieldLabel>
      <Input id={`sermon-${name}`} variant="filled" {...register(`sermon.${name}`)} aria-invalid={!!errors.sermon?.[name]} />
      <FieldError errors={[errors.sermon?.[name]]} />
    </Field>)}
  </div>;
}

export function SermonEditor({ preview }: { preview: boolean }) {
  const { control, setError, clearErrors, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { pages, ready } = useSermonPages();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [previewFont, setPreviewFont] = useState("");
  const current = Math.min(page, pages.length - 1);
  const expandedIndex = expanded === null ? null : Math.min(expanded, pages.length);
  const openCard = (index: number, children: React.ReactNode, className = "") => <button type="button" aria-label={`설교 ${index === 0 ? "표지" : `본문 ${index}페이지`} 크게 보기`} onClick={event => { setPreviewFont(getComputedStyle(event.currentTarget).getPropertyValue("--font-home-body")); setExpanded(index); }} className={`block w-full rounded-[14px] text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring ${className}`}>{children}</button>;

  return <div className="weekly-sermon-layout mt-[70px] flex items-start gap-8 max-lg:flex-col">
    <div className="w-[380px] shrink-0 max-lg:w-full">
      {preview ? <Field className="gap-2" data-invalid={!!errors.sermon?.document}>
        <FieldLabel htmlFor="sermon-content" className="text-sm font-semibold text-secondary-foreground">정리 내용</FieldLabel>
        <Controller control={control} name="sermon.document" render={({ field }) => <RichTextEditor id="sermon-content" value={field.value} onChange={value => {
          field.onChange(value);
          const result = richDocumentSchema.safeParse(value);
          if (!result.success) setError("sermon.document", { message: result.error.issues[0].message });
          else clearErrors("sermon.document");
        }} onBlur={field.onBlur} invalid={!!errors.sermon?.document} />} />
        <FieldError errors={[errors.sermon?.document]} />
      </Field> : <SermonFields />}
    </div>
    <section className="min-w-0 flex-1 rounded-3xl bg-card p-6 max-lg:w-full" aria-label={preview ? "설교 본문 카드뉴스 미리보기" : "설교 표지 미리보기"} aria-busy={preview && !ready}>
      {!preview ? <><h2 className="mb-5 text-lg font-bold">표지 미리보기</h2><figure className="mx-auto w-full max-w-[360px]">{openCard(0, <SermonCard index={0} />)}<figcaption className="mt-3 text-sm text-secondary-foreground">1 표지</figcaption></figure></> : <>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold tracking-[-0.72px]">본문 카드뉴스 {pages.length}장</h2><span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">{errors.sermon?.document ? "입력 내용을 확인해 주세요" : ready ? "실시간 반영됨" : <><Spinner className="size-3" />페이지 계산 중…</>}</span></div>
        <Tabs defaultValue="album" className="mt-4">
          <TabsList variant="line" aria-label="보기 방식">
            <TabsTrigger value="album" className="gap-2"><Image src="/images/weekly/0f022.svg" alt="" width={16} height={16} />앨범형</TabsTrigger>
            <TabsTrigger value="list" className="gap-2"><Image src="/images/weekly/f42b6.svg" alt="" width={16} height={16} />목록형</TabsTrigger>
          </TabsList>
          <TabsContent value="album" className="mt-4 grid grid-cols-3 gap-x-4 gap-y-5 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {pages.map((_, index) => <figure key={index} className="weekly-enter">{openCard(index + 1, <SermonCard index={index + 1} />)}<figcaption className="mt-2 text-[13px] text-secondary-foreground">{index + 2}</figcaption></figure>)}
          </TabsContent>
          <TabsContent value="list" className="mt-4">
            <div className="relative flex min-h-[420px] items-center justify-center rounded-[20px] bg-secondary/50 px-12 py-7">
              <Button type="button" variant="outline" size="icon" aria-label="이전 페이지" disabled={current === 0} onClick={() => setPage(current - 1)} className="absolute left-3 rounded-full"><Image src="/images/weekly/6e9e8.svg" alt="" width={20} height={20} /></Button>
              <div className="w-full max-w-[300px]">{openCard(current + 1, <SermonCard index={current + 1} />)}</div>
              <Button type="button" variant="outline" size="icon" aria-label="다음 페이지" disabled={current === pages.length - 1} onClick={() => setPage(current + 1)} className="absolute right-3 rounded-full"><Image src="/images/weekly/12acf.svg" alt="" width={20} height={20} /></Button>
            </div>
            <p className="mt-2 text-center text-sm text-secondary-foreground" aria-live="polite">{current + 1}/{pages.length}</p>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">{pages.map((_, index) => <button type="button" key={index} onClick={() => setPage(index)} aria-label={`본문 ${index + 1}페이지 보기`} aria-pressed={current === index} className={`w-14 shrink-0 rounded-md border-2 p-0.5 ${current === index ? "border-home-brand" : "border-transparent"}`}><SermonCard index={index + 1} /></button>)}</div>
          </TabsContent>
        </Tabs>
      </>}
    </section>
    <Dialog open={expandedIndex !== null} onOpenChange={open => { if (!open) setExpanded(null); }}>
      <DialogContent style={{ "--font-home-body": previewFont } as React.CSSProperties} className="weekly-popover max-h-[95svh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader><DialogTitle>{expandedIndex === 0 ? "설교 표지" : `설교 본문 ${expandedIndex}페이지`}</DialogTitle><DialogDescription>입력한 내용이 실시간으로 반영된 미리보기예요.</DialogDescription></DialogHeader>
        {expandedIndex !== null && <div className="mx-auto w-full max-w-[min(480px,calc(65svh*0.8))]"><SermonCard index={expandedIndex} /></div>}
        {preview && expandedIndex !== null && <div className="flex items-center justify-between"><Button variant="outline" disabled={expandedIndex <= 1} onClick={() => setExpanded(expandedIndex - 1)}>이전</Button><span className="text-sm">{expandedIndex}/{pages.length}</span><Button variant="outline" disabled={expandedIndex >= pages.length} onClick={() => setExpanded(expandedIndex + 1)}>다음</Button></div>}
      </DialogContent>
    </Dialog>
  </div>;
}
