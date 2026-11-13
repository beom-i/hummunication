"use client";

import Image from "next/image";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentEntryList } from "./content-entry-list";
import { CardPreview } from "./card-preview";
import { ContentEditorLayout } from "./content-editor-layout";
import { FamilyCard } from "@/features/weekly/templates/family-card";
import { newFamily, type WeeklyFormData } from "../schemas";
import { useCardPages } from "@/features/weekly/templates/card-pages";
import { PhotoField } from "@/features/files/components/photo-field";

export function FamilyList({ onEdit }: { onEdit: (index: number) => void }) {
  const { control } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "families" });
  const families = useWatch({ control, name: "families" });
  return <ContentEntryList entries={fields.map((field, index) => ({ id: field.id, name: families[index]?.name ?? "", photo: families[index]?.photo, photoEdit: families[index]?.photo_edit }))} kind="순" onEdit={onEdit} onRemove={remove} onAdd={() => { append(newFamily(), { shouldFocus: false }); onEdit(fields.length); }} />;
}

function FamilyFields({ index }: { index: number }) {
  const { register, control, setValue, setError, clearErrors, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: `families.${index}.members` });
  const group = useWatch({ control, name: `families.${index}` });
  const groupErrors = errors.families?.[index];

  return <section className="family-form flex w-full flex-col gap-4" aria-label="새가족 순 편집">
    <div className="family-form-card flex flex-col gap-6">
    <Field className="gap-3">
      <FieldLabel htmlFor="family-name" className="text-lg font-bold">순 이름</FieldLabel>
      <Input id="family-name" variant="filled" className="h-[41px] rounded-2xl text-lg" placeholder="순 이름을 입력해 주세요" {...register(`families.${index}.name`)} aria-invalid={!!groupErrors?.name} />
    </Field>
    <Field className="gap-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
      <FieldLabel htmlFor="family-photo" className="text-lg font-bold">단체 사진</FieldLabel>
      <Controller control={control} name={`families.${index}.photo`} render={({ field }) => <PhotoField id="family-photo" label="단체 사진" aspect={16 / 9} value={{ source: field.value, fileId: group.photo_id, edit: group.photo_edit }} onBlur={field.onBlur} inputRef={field.ref} onError={message => setError(`families.${index}.photo`, { message })} onChange={photo => {
        field.onChange(photo.source);
        setValue(`families.${index}.photo_id`, photo.fileId, { shouldDirty: true });
        setValue(`families.${index}.photo_edit`, photo.edit, { shouldDirty: true });
        clearErrors([`families.${index}.photo`, `families.${index}.photo_edit`]);
      }} />} />
    </Field>
    <Divider>순장 답변</Divider>
    <div className="rounded-2xl bg-card">
      <div className="mb-2 flex items-center gap-2"><span className="flex h-[22px] shrink-0 items-center rounded-full bg-primary px-2 text-xs font-bold whitespace-nowrap text-home-brand">순장</span><Input variant="filled" className="answer-name h-8 bg-card px-1 font-bold" aria-label="순장 이름" placeholder="순장 이름" {...register(`families.${index}.leader_name`)} aria-invalid={!!groupErrors?.leader_name} /></div>
      <Textarea variant="filled" className="min-h-[68px] border-0 px-[14px] py-3 text-sm leading-[1.55] md:text-sm" aria-label="순장 답변" placeholder="순장 답변을 입력해 주세요" {...register(`families.${index}.leader_answer`)} />
    </div>
    <Divider>순원 답변</Divider>
    {fields.map((field, memberIndex) => <div key={field.id} className="weekly-enter rounded-2xl bg-card">
      <div className="mb-2 flex items-center gap-2"><span className="flex h-[22px] shrink-0 items-center rounded-full bg-primary px-2 text-xs font-bold text-home-brand">순원 {memberIndex + 1}</span><Input variant="filled" className="answer-name h-8 bg-card px-1 font-bold" aria-label={`순원 ${memberIndex + 1} 이름`} placeholder="순원 이름" {...register(`families.${index}.members.${memberIndex}.name`)} aria-invalid={!!groupErrors?.members?.[memberIndex]?.name} /><Button variant="ghost" size="xs" onClick={() => remove(memberIndex)} aria-label={`순원 ${memberIndex + 1} 삭제`} className="size-8 rounded-full bg-secondary p-0"><Image src="/images/weekly/cb1b2.svg" alt="" width={11} height={12} /></Button></div>
      <Textarea variant="filled" className="min-h-[68px] border-0 px-[14px] py-3 text-sm leading-[1.55] md:text-sm" aria-label={`순원 ${memberIndex + 1} 답변`} placeholder="답변을 입력해 주세요" {...register(`families.${index}.members.${memberIndex}.answer`)} />
    </div>)}
    </div>
    <Button variant="outline" disabled={fields.length >= 30} className="h-10 gap-2 self-center rounded-full border-dashed px-4 text-base font-bold" onClick={() => append({ name: "", answer: "" })}>순원 추가하기<Image src="/images/weekly/5d700.svg" alt="" width={20} height={20} /></Button>
  </section>;
}

function Divider({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 pt-1.5 text-[13px] font-bold text-secondary-foreground">{children}<span className="h-px flex-1 bg-border" /></div>;
}

export function FamilyEditor({ index, initialPage = 0 }: { index: number; initialPage?: number }) {
  const [page, setPage] = useState(Math.max(0, initialPage - 1));
  const { families } = useCardPages();
  const count = 1 + (families[index]?.length ?? 1);
  const current = Math.min(page, count - 1);
  return <ContentEditorLayout preview={
    <CardPreview label="새가족 카드뉴스 미리보기" navigationLabel="새가족 카드" index={current} count={count} onNavigate={setPage}>
      <div key={current} className="weekly-enter"><FamilyCard index={current + 1} groupIndex={index} /></div>
    </CardPreview>
  }>
    <FamilyFields index={index} />
  </ContentEditorLayout>;
}
