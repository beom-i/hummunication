"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentEntryList } from "./content-entry-list";
import { FamilyCard, familyPageCount } from "./preview-cards";
import { newFamily, photoSchema, type WeeklyFormData } from "./schemas";
import { CroppedPhoto, PhotoCropDialog } from "./photo-crop";

export function FamilyList({ onEdit }: { onEdit: (index: number) => void }) {
  const { control, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "groups" });
  const groups = useWatch({ control, name: "groups" });
  return <><ContentEntryList entries={fields.map((field, index) => ({ id: field.id, name: groups[index]?.name ?? "", photo: groups[index]?.photo, photoEdit: groups[index]?.photoEdit }))} kind="순" onEdit={onEdit} onRemove={remove} onAdd={() => { append({ ...newFamily(fields.length), name: "" }, { shouldFocus: false }); onEdit(fields.length); }} /><div className="mx-auto mt-4 max-w-[438px]"><FieldError errors={[errors.groups?.root, ...groups.map((_, index) => errors.groups?.[index]?.name)]} /></div></>;
}

export function FamilyEditor({ index }: { index: number }) {
  const [cropping, setCropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { register, control, setValue, setError, clearErrors, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: `groups.${index}.members` });
  const group = useWatch({ control, name: `groups.${index}` });
  const groupErrors = errors.groups?.[index];
  const photoInput = register(`groups.${index}.photo`);
  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = photoSchema.safeParse(file);
    if (!result.success) { setError(`groups.${index}.photo`, { message: result.error.issues[0].message }); return; }
    const reader = new FileReader();
    reader.onload = () => { setValue(`groups.${index}.photo`, String(reader.result), { shouldDirty: true }); setValue(`groups.${index}.photoId`, null, { shouldDirty: true }); setValue(`groups.${index}.photoEdit`, undefined, { shouldDirty: true }); clearErrors(`groups.${index}.photo`); };
    reader.onerror = () => setError(`groups.${index}.photo`, { message: "사진을 다시 올려 주세요" });
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return <section className="family-form mx-auto mt-[60px] flex w-full max-w-[560px] flex-col gap-4 max-sm:px-5" aria-label="새가족 순 편집">
    <div className="family-form-card flex flex-col gap-6">
    <Field className="gap-3">
      <FieldLabel htmlFor="family-name" className="text-lg font-bold">순 이름</FieldLabel>
      <Input id="family-name" variant="filled" className="h-[41px] rounded-2xl text-lg" placeholder="순장님 이름을 입력해 주세요" {...register(`groups.${index}.name`)} aria-invalid={!!groupErrors?.name} />
      <FieldError errors={[groupErrors?.name]} />
    </Field>
    <Field className="gap-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
      <FieldLabel htmlFor="family-photo" className="text-lg font-bold">단체 사진</FieldLabel>
      <input type="hidden" {...photoInput} />
      {group.photo ? <button type="button" aria-label="단체 사진 크롭 편집" onClick={() => setCropping(true)} className="relative h-[213px] w-full overflow-hidden rounded-2xl border bg-muted outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"><CroppedPhoto source={group.photo} edit={group.photoEdit} label="업로드한 단체 사진" className="absolute inset-0 size-full" /></button> : <label htmlFor="family-photo" className="relative flex h-[256px] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border bg-muted"><span className="flex size-11 items-center justify-center rounded-full bg-card"><Image src="/images/weekly/a02dc.png" alt="" width={35} height={35} /></span><span className="text-base font-semibold text-secondary-foreground">사진 올리기</span></label>}
      <input ref={fileInput} id="family-photo" type="file" accept="image/png,image/jpeg,image/webp" aria-label="단체 사진 올리기" onChange={uploadPhoto} className="sr-only w-px!" />
      {group.photo && <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" className="h-10 gap-2 rounded-xl font-semibold" onClick={() => fileInput.current?.click()}><ImagePlus className="size-4" />사진 교체</Button><Button type="button" variant="destructive" className="h-10 gap-2 rounded-xl font-semibold" onClick={() => { setValue(`groups.${index}.photo`, "", { shouldDirty: true }); setValue(`groups.${index}.photoId`, null, { shouldDirty: true }); setValue(`groups.${index}.photoEdit`, undefined, { shouldDirty: true }); }}><Trash2 className="size-4" />사진 삭제</Button></div>}
      <FieldError errors={[groupErrors?.photo]} />
      {cropping && group.photo && <PhotoCropDialog source={group.photo} edit={group.photoEdit} onApply={edit => setValue(`groups.${index}.photoEdit`, edit, { shouldDirty: true })} onClose={() => setCropping(false)} />}
    </Field>
    <Divider>순장 답변</Divider>
    <div className="rounded-2xl bg-card p-[14px]">
      <div className="mb-2 flex items-center gap-2"><span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold whitespace-nowrap text-home-brand">순장</span><Input variant="filled" className="answer-name h-8 bg-card px-1 font-bold" aria-label="순장 이름" {...register(`groups.${index}.leader.name`)} aria-invalid={!!groupErrors?.leader?.name} /></div>
      <Textarea variant="filled" className="min-h-[68px] text-sm leading-[1.55]" aria-label="순장 답변" {...register(`groups.${index}.leader.answer`)} />
      <FieldError errors={[groupErrors?.leader?.name, groupErrors?.leader?.answer]} />
    </div>
    <Divider>순원 답변</Divider>
    {fields.map((field, memberIndex) => <div key={field.id} className="weekly-enter rounded-2xl bg-card p-[14px]">
      <div className="mb-2 flex items-center gap-2"><span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold text-home-brand">순원 {memberIndex + 1}</span><Input variant="filled" className="answer-name h-8 bg-card px-1 font-bold" aria-label={`순원 ${memberIndex + 1} 이름`} {...register(`groups.${index}.members.${memberIndex}.name`)} aria-invalid={!!groupErrors?.members?.[memberIndex]?.name} /><Button variant="ghost" size="xs" onClick={() => remove(memberIndex)} aria-label={`순원 ${memberIndex + 1} 삭제`} className="size-8 rounded-full bg-secondary p-0"><Trash2 className="size-3.5" /></Button></div>
      <Textarea variant="filled" className="min-h-[68px] text-sm leading-[1.55]" aria-label={`순원 ${memberIndex + 1} 답변`} placeholder="답변을 입력해 주세요" {...register(`groups.${index}.members.${memberIndex}.answer`)} />
      <FieldError errors={[groupErrors?.members?.[memberIndex]?.name, groupErrors?.members?.[memberIndex]?.answer]} />
    </div>)}
    </div>
    <Button variant="outline" disabled={fields.length >= 30} className="h-10 gap-2 self-center rounded-full border-dashed px-4 text-base font-bold" onClick={() => append({ name: `순원 ${fields.length + 1}`, answer: "" })}>순원 추가하기<Image src="/images/weekly/5d700.svg" alt="" width={20} height={20} /></Button>
  </section>;
}

function Divider({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 pt-1.5 text-[13px] font-bold text-secondary-foreground">{children}<span className="h-px flex-1 bg-border" /></div>;
}

export function FamilyPreview({ onEdit }: { onEdit: (index: number, page?: number) => void }) {
  const { control } = useFormContext<WeeklyFormData>();
  const groups = useWatch({ control, name: "groups" });
  return <div className="weekly-centered mx-auto mt-[60px] w-full max-w-[1200px] space-y-8 px-0 max-xl:px-6">
    <div className="flex items-center gap-5 rounded-3xl bg-card p-5"><div className="w-24"><FamilyCard index={0} /></div><h2 className="text-lg font-bold">공통 표지</h2></div>
    {groups.map((group, groupIndex) => <section key={groupIndex} aria-label={`${group.name} 미리보기`}>
      <div className="mb-5 flex items-center gap-2.5 rounded-[20px] bg-card px-5 py-4">
        <span className="rounded-full bg-primary px-3 py-2 text-sm font-bold text-home-brand">{group.name}</span><span className="rounded-full bg-secondary px-3 py-2 text-sm text-secondary-foreground">순원 {group.members.length}명</span>
        <Button variant="secondary" size="sm" onClick={() => onEdit(groupIndex)} className="ml-auto text-[13px]">입력 내용 수정</Button>
      </div>
      <div className="rounded-3xl bg-card p-6 pr-0">
        <div className="mb-4 flex items-center justify-between gap-3 pr-6"><h2 className="text-lg font-bold">카드뉴스 {familyPageCount(group)}장</h2><p className="text-[13px] text-secondary-foreground">옆으로 넘겨서 확인해요 →</p></div>
        <div className="flex snap-x gap-6 overflow-x-auto pt-1 pr-6 pb-3 pl-1">
          {Array.from({ length: familyPageCount(group) }, (_, index) => <figure key={index} className="relative w-[300px] shrink-0 snap-start"><FamilyCard index={index} groupIndex={groupIndex} /><Button variant="secondary" size="sm" className="absolute right-3 bottom-12 rounded-full bg-card shadow-sm" onClick={() => onEdit(groupIndex, index)}>편집</Button><figcaption className="mt-3 flex items-center justify-between text-sm font-bold">{index === 0 ? "표지" : index === 1 ? `${group.name} 썸네일` : `${index} 문답`}<Button variant="secondary" size="sm" onClick={() => onEdit(groupIndex)}>수정</Button></figcaption></figure>)}
        </div>
      </div>
    </section>)}
  </div>;
}

export function FamilyCardEditor({ index, initialPage = 0 }: { index: number; initialPage?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const group = useWatch({ control, name: `groups.${index}` });
  const [page, setPage] = useState(initialPage);
  const count = familyPageCount(group);
  const current = Math.min(page, count - 1);
  return <div className="weekly-centered family-detail-layout mx-auto mt-[60px] w-full max-w-[1112px]">
    <section className="rounded-2xl border bg-card p-5" aria-label="새가족 카드뉴스 미리보기"><h2 className="mb-4 text-base font-bold">카드뉴스 미리보기</h2><div className="relative px-14"><Button variant="outline" size="icon-lg" className="preview-nav left-0 rounded-full" aria-label="이전 새가족 카드" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button><div key={current} className="weekly-enter"><FamilyCard index={current} groupIndex={index} /></div><Button variant="outline" size="icon-lg" className="preview-nav right-0 rounded-full" aria-label="다음 새가족 카드" disabled={current + 1 >= count} onClick={() => setPage(current + 1)}><ChevronRight /></Button></div></section>
    <FamilyEditor index={index} />
  </div>;
}
