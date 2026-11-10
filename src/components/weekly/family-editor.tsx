"use client";

import Image from "next/image";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FamilyCard, familyPageCount } from "./preview-cards";
import { newFamily, photoSchema, type WeeklyFormData } from "./schemas";

export function FamilyList({ onEdit }: { onEdit: (index: number) => void }) {
  const { control } = useFormContext<WeeklyFormData>();
  const { fields, append } = useFieldArray({ control, name: "groups" });
  const groups = useWatch({ control, name: "groups" });
  return <section className="weekly-centered mx-auto mt-[54px] flex w-full max-w-[438px] flex-col items-center gap-5 max-sm:px-5" aria-label="새가족 순 목록">
    {fields.map((field, index) => <article key={field.id} className="weekly-enter w-full rounded-[30px] border bg-card p-[15px]">
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
        {groups[index].photo ? <Image src={groups[index].photo} alt={`${groups[index].name} 단체 사진`} fill unoptimized className="object-cover" /> : <Image src="/images/weekly/8b670.png" alt="" width={164} height={164} />}
      </div>
      <div className="mt-5 mb-1 flex items-center gap-[14px] px-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-base font-bold text-home-brand">{index + 1}</span>
        <h2 className="text-xl font-bold tracking-[-0.4px]">{groups[index].name}</h2>
        <Button variant="secondary" onClick={() => onEdit(index)} aria-label={`${groups[index].name} 편집`} className="ml-auto h-[38px] gap-1 rounded-full px-4 text-base font-bold"><Image src="/images/weekly/b44af.svg" alt="" width={18} height={18} />편집</Button>
      </div>
    </article>)}
    <Button variant="outline" disabled={fields.length >= 20} className="h-[59px] gap-[14px] rounded-full border-dashed px-[27px] text-xl font-bold active:translate-y-0" onClick={() => { append(newFamily(fields.length), { shouldFocus: false }); onEdit(fields.length); }}>순 추가하기<Image src="/images/weekly/ebecb.svg" alt="" width={24} height={24} /></Button>
  </section>;
}

export function FamilyEditor({ index }: { index: number }) {
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
    reader.onload = () => { setValue(`groups.${index}.photo`, String(reader.result), { shouldDirty: true }); clearErrors(`groups.${index}.photo`); };
    reader.onerror = () => setError(`groups.${index}.photo`, { message: "사진을 다시 올려 주세요" });
    reader.readAsDataURL(file);
  };
  return <section className="weekly-centered mx-auto mt-[54px] flex w-full max-w-[438px] flex-col gap-4 max-sm:px-5" aria-label="새가족 순 편집">
    <Field className="gap-[19px] rounded-[30px] border bg-card px-4 py-5">
      <FieldLabel htmlFor="family-name" className="text-lg font-bold">순 이름</FieldLabel>
      <Input id="family-name" variant="filled" className="h-[41px] rounded-2xl border text-lg" {...register(`groups.${index}.name`)} aria-invalid={!!groupErrors?.name} />
      <FieldError errors={[groupErrors?.name]} />
    </Field>
    <Field className="gap-[19px] rounded-[30px] border bg-card px-4 py-5">
      <FieldLabel htmlFor="family-photo" className="text-lg font-bold">단체 사진</FieldLabel>
      <input type="hidden" {...photoInput} />
      <label htmlFor="family-photo" className="relative flex h-[213px] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
        {group.photo ? <Image src={group.photo} alt="업로드한 단체 사진" fill unoptimized className="object-cover" /> : <><span className="flex size-11 items-center justify-center rounded-full bg-card"><Image src="/images/weekly/a02dc.png" alt="" width={35} height={35} /></span><span className="text-base font-semibold text-secondary-foreground">사진 올리기</span></>}
        <input id="family-photo" type="file" accept="image/png,image/jpeg,image/webp" aria-label="단체 사진 올리기" onChange={uploadPhoto} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      {group.photo && <Button variant="ghost" size="sm" className="self-start" onClick={() => setValue(`groups.${index}.photo`, "", { shouldDirty: true })}>사진 삭제</Button>}
      <FieldError errors={[groupErrors?.photo]} />
    </Field>
    <Divider>순장 답변</Divider>
    <div className="rounded-2xl bg-card p-[14px]">
      <div className="mb-2 flex items-center gap-2"><span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold whitespace-nowrap text-home-brand">순장</span><Input variant="filled" className="h-8 bg-card px-1 font-bold" aria-label="순장 이름" {...register(`groups.${index}.leader.name`)} aria-invalid={!!groupErrors?.leader?.name} /></div>
      <Textarea variant="filled" className="min-h-[68px] text-sm leading-[1.55]" aria-label="순장 답변" {...register(`groups.${index}.leader.answer`)} />
      <FieldError errors={[groupErrors?.leader?.name, groupErrors?.leader?.answer]} />
    </div>
    <Divider>순원 답변</Divider>
    {fields.map((field, memberIndex) => <div key={field.id} className="weekly-enter rounded-2xl bg-card p-[14px]">
      <div className="mb-2 flex items-center gap-2"><span className="shrink-0 rounded-full bg-primary px-2 py-1 text-xs font-bold text-home-brand">순원 {memberIndex + 1}</span><Input variant="filled" className="h-8 bg-card px-1 font-bold" aria-label={`순원 ${memberIndex + 1} 이름`} {...register(`groups.${index}.members.${memberIndex}.name`)} aria-invalid={!!groupErrors?.members?.[memberIndex]?.name} /><Button variant="ghost" size="xs" onClick={() => remove(memberIndex)} aria-label={`순원 ${memberIndex + 1} 삭제`}>삭제</Button></div>
      <Textarea variant="filled" className="min-h-[68px] text-sm leading-[1.55]" aria-label={`순원 ${memberIndex + 1} 답변`} placeholder="답변을 입력해 주세요" {...register(`groups.${index}.members.${memberIndex}.answer`)} />
      <FieldError errors={[groupErrors?.members?.[memberIndex]?.name, groupErrors?.members?.[memberIndex]?.answer]} />
    </div>)}
    <Button variant="outline" disabled={fields.length >= 30} className="h-10 gap-2 self-center rounded-full border-dashed px-4 text-base font-bold" onClick={() => append({ name: `순원 ${fields.length + 1}`, answer: "" })}>순원 추가하기<Image src="/images/weekly/5d700.svg" alt="" width={20} height={20} /></Button>
  </section>;
}

function Divider({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 pt-1.5 text-[13px] font-bold text-secondary-foreground">{children}<span className="h-px flex-1 bg-border" /></div>;
}

export function FamilyPreview({ onEdit }: { onEdit: (index: number) => void }) {
  const { control } = useFormContext<WeeklyFormData>();
  const groups = useWatch({ control, name: "groups" });
  return <div className="weekly-centered mx-auto mt-[90px] w-full max-w-[1200px] space-y-8 px-0 max-xl:px-6">
    {groups.map((group, groupIndex) => <section key={groupIndex} aria-label={`${group.name} 미리보기`}>
      <div className="mb-5 flex items-center gap-2.5 rounded-[20px] bg-card px-5 py-4">
        <span className="rounded-full bg-primary px-3 py-2 text-sm font-bold text-home-brand">{group.name}</span><span className="rounded-full bg-secondary px-3 py-2 text-sm text-secondary-foreground">순원 {group.members.length}명</span>
        <Button variant="secondary" size="sm" onClick={() => onEdit(groupIndex)} className="ml-auto text-[13px]">입력 내용 수정</Button>
      </div>
      <div className="rounded-3xl bg-card p-6 pr-0">
        <div className="mb-4 flex items-center justify-between gap-3 pr-6"><h2 className="text-lg font-bold">카드뉴스 {familyPageCount(group)}장</h2><p className="text-[13px] text-secondary-foreground">옆으로 넘겨서 확인해요 →</p></div>
        <div className="flex snap-x gap-6 overflow-x-auto pt-1 pr-6 pb-3 pl-1">
          {Array.from({ length: familyPageCount(group) }, (_, index) => <figure key={index} className="w-[300px] shrink-0 snap-start"><FamilyCard index={index} groupIndex={groupIndex} /><figcaption className="mt-3 flex items-center justify-between text-sm font-bold">{index === 0 ? "표지" : index === 1 ? `${group.name} 썸네일` : `${index} 문답`}<Button variant="secondary" size="sm" onClick={() => onEdit(groupIndex)}>수정</Button></figcaption></figure>)}
        </div>
      </div>
    </section>)}
  </div>;
}
