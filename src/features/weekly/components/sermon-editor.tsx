"use client";

import { useState } from "react";
import Image from "next/image";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { richDocumentSchema } from "@/components/ui/rich-text-editor/schemas";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ContentEditorLayout } from "./content-editor-layout";
import { SermonPreviewSkeleton } from "./weekly-skeleton";
import { SermonCard } from "@/features/weekly/templates/sermon-card";
import { PhotoField } from "@/features/files/components/photo-field";
import { useSermonPages } from "@/features/weekly/templates/sermon-pages";
import { type WeeklyFormData } from "../schemas";

function SermonFields() {
  const { control, register, watch, setValue, setError, clearErrors, formState: { errors } } = useFormContext<WeeklyFormData>();
  const thumbnailId = watch("sermon.thumbnailId");
  const thumbnailEdit = watch("sermon.thumbnailEdit");
  return <div className="sermon-fields flex w-full flex-col gap-5">
    <Field data-invalid={!!errors.sermon?.date} className="gap-2">
      <FieldLabel htmlFor="sermon-date" className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">설교 날짜</FieldLabel>
      <Controller control={control} name="sermon.date" render={({ field }) => <DatePicker id="sermon-date" name={field.name} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={!!errors.sermon?.date} />} />
      <FieldError errors={[errors.sermon?.date]} />
    </Field>
    {([{ name: "speaker", label: "설교자" }, { name: "title", label: "설교 제목" }, { name: "bible", label: "성경 본문" }] as const).map(({ name, label }) => <Field key={name} data-invalid={!!errors.sermon?.[name]} className="gap-2">
      <FieldLabel htmlFor={`sermon-${name}`} className="text-sm font-semibold tracking-[-0.42px] text-secondary-foreground">{label}</FieldLabel>
      <Input id={`sermon-${name}`} variant="filled" {...register(`sermon.${name}`)} aria-invalid={!!errors.sermon?.[name]} />
      <FieldError errors={[errors.sermon?.[name]]} />
    </Field>)}
    <Field className="gap-2" data-invalid={!!errors.sermonThumbnail}>
      <FieldLabel htmlFor="sermon-thumbnail" className="text-sm font-semibold text-secondary-foreground">썸네일</FieldLabel>
      <Controller control={control} name="sermonThumbnail" render={({ field }) => <PhotoField id="sermon-thumbnail" label="설교 썸네일" aspect={16 / 9} value={{ source: field.value ?? "", fileId: thumbnailId ?? null, edit: thumbnailEdit ?? null }} onBlur={field.onBlur} inputRef={field.ref} onError={message => setError("sermonThumbnail", { message })} onChange={photo => {
        field.onChange(photo.source);
        setValue("sermon.thumbnailId", photo.fileId, { shouldDirty: true });
        setValue("sermon.thumbnailEdit", photo.edit, { shouldDirty: true });
        clearErrors(["sermonThumbnail", "sermon.thumbnailEdit"]);
      }} />} />
      <FieldError errors={[errors.sermonThumbnail, errors.sermon?.thumbnailEdit]} />
    </Field>
  </div>;
}

export function SermonEditor({ preview }: { preview: boolean }) {
  const { control, setError, clearErrors, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { pages, ready } = useSermonPages();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [previewFont, setPreviewFont] = useState("");
  const [previewCardFont, setPreviewCardFont] = useState("");
  const current = Math.min(page, pages.length);
  const expandedIndex = expanded === null ? null : Math.min(expanded, pages.length);
  const openCard = (index: number, children: React.ReactNode) => <button type="button" aria-label={`설교 ${index === 0 ? "표지" : `본문 ${index}페이지`} 크게 보기`} onClick={event => { const style = getComputedStyle(event.currentTarget); setPreviewFont(style.getPropertyValue("--font-home-body")); setPreviewCardFont(style.getPropertyValue("--font-card-body")); setExpanded(index); }} className="block w-full rounded-[14px] text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">{children}</button>;

  let previewContent;
  if (preview && !ready) previewContent = <SermonPreviewSkeleton />;
  else if (!preview) previewContent = <><h2 className="mb-4 text-lg font-bold">표지 이미지</h2><div className="weekly-preview-stage px-6 py-7"><figure className="mx-auto w-full max-w-[300px]">{openCard(0, <SermonCard index={0} />)}<figcaption className="mx-auto mt-3 w-fit rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">표지</figcaption></figure></div></>;
  else previewContent = <>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold tracking-[-0.72px]">카드뉴스 {pages.length + 1}장</h2></div>
        <Tabs defaultValue="album" className="mt-4">
          <TabsList variant="line" aria-label="보기 방식" className="w-full justify-start border-b">
            <TabsTrigger value="album" className="flex-none gap-2"><Image src="/images/weekly/0f022.svg" alt="" width={16} height={16} />앨범형</TabsTrigger>
            <TabsTrigger value="list" className="flex-none gap-2"><Image src="/images/weekly/f42b6.svg" alt="" width={16} height={16} />목록형</TabsTrigger>
          </TabsList>
          <TabsContent value="album" className="sermon-preview-grid mt-2">
            {pages.map((_, index) => <figure key={index} className="weekly-enter">{openCard(index + 1, <SermonCard index={index + 1} />)}<figcaption className="mt-2 text-[13px] text-secondary-foreground">{index + 2}</figcaption></figure>)}
          </TabsContent>
          <TabsContent value="list" className="mt-2">
            <div className="weekly-preview-stage sermon-list-stage">
              <div className="relative px-12"><Button type="button" variant="outline" size="icon-lg" aria-label="이전 페이지" disabled={current === 0} onClick={() => setPage(current - 1)} className="preview-nav left-0 rounded-full"><Image src="/images/weekly/6e9e8.svg" alt="" width={20} height={20} /></Button>
                <div key={current} className="sermon-list-card weekly-enter">{openCard(current, <SermonCard index={current} />)}</div>
                <Button type="button" variant="outline" size="icon-lg" aria-label="다음 페이지" disabled={current === pages.length} onClick={() => setPage(current + 1)} className="preview-nav right-0 rounded-full"><Image src="/images/weekly/12acf.svg" alt="" width={20} height={20} /></Button></div>
              <p className="mx-auto mt-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground" aria-live="polite">{current + 1}/{pages.length + 1}</p>
              <div className="mt-5 flex justify-center gap-2 overflow-x-auto pb-2">{Array.from({ length: pages.length + 1 }, (_, index) => <button type="button" key={index} onClick={() => setPage(index)} aria-label={`설교 ${index + 1}페이지 보기`} aria-pressed={current === index} className={`w-14 shrink-0 rounded-md border-2 p-0.5 ${current === index ? "border-home-brand" : "border-transparent"}`}><SermonCard index={index} /></button>)}</div>
            </div>
          </TabsContent>
        </Tabs>
      </>;

  return <>
    <ContentEditorLayout preview={
    <section className="weekly-preview-panel" aria-label={preview ? "설교 본문 카드뉴스 미리보기" : "설교 표지 미리보기"} aria-busy={preview && !ready}>
      {previewContent}
    </section>
    }>
      {preview ? <Field className="gap-2" data-invalid={!!errors.sermon?.content}>
        <FieldLabel htmlFor="sermon-content" className="text-sm leading-5 font-semibold text-secondary-foreground">정리 내용</FieldLabel>
        <Controller control={control} name="sermon.content" render={({ field }) => <RichTextEditor id="sermon-content" value={field.value} onChange={value => {
          field.onChange(value);
          const result = richDocumentSchema.safeParse(value);
          if (!result.success) setError("sermon.content", { message: result.error.issues[0].message });
          else clearErrors("sermon.content");
        }} onBlur={field.onBlur} invalid={!!errors.sermon?.content} />} />
        <FieldError errors={[errors.sermon?.content]} />
      </Field> : <SermonFields />}
    </ContentEditorLayout>
    <Dialog open={expandedIndex !== null} onOpenChange={open => { if (!open) setExpanded(null); }}>
      <DialogContent style={{ "--font-home-body": previewFont, "--font-card-body": previewCardFont } as React.CSSProperties} className="weekly-popover max-h-[95svh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader><DialogTitle>{expandedIndex === 0 ? "설교 표지" : `설교 본문 ${expandedIndex}페이지`}</DialogTitle><DialogDescription>입력한 내용이 실시간으로 반영된 미리보기예요.</DialogDescription></DialogHeader>
        {expandedIndex !== null && <div className="mx-auto w-full max-w-[min(480px,calc(65svh*0.8))]"><SermonCard index={expandedIndex} /></div>}
        {preview && expandedIndex !== null && <div className="flex items-center justify-between"><Button variant="outline" disabled={expandedIndex === 0} onClick={() => setExpanded(expandedIndex - 1)}>이전</Button><span className="text-sm">{expandedIndex + 1}/{pages.length + 1}</span><Button variant="outline" disabled={expandedIndex >= pages.length} onClick={() => setExpanded(expandedIndex + 1)}>다음</Button></div>}
      </DialogContent>
    </Dialog>
  </>;
}
