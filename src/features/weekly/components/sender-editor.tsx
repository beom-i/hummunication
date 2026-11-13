"use client";

import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { ContentEntryList } from "./content-entry-list";
import { CardPreview } from "./card-preview";
import { ContentEditorLayout } from "./content-editor-layout";
import { useCardPages } from "../templates/card-pages";
import type { WeeklyFormData } from "../schemas";
import { newSender } from "@/features/sender/schemas";
import { SenderCard } from "../templates/sender-card";

export function SenderList({ onEdit }: { onEdit: (index: number) => void }) {
  const { control, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "senders" });
  const senders = useWatch({ control, name: "senders" }) ?? [];
  return <><ContentEntryList entries={fields.map((field, index) => ({ id: field.id, name: senders[index]?.name ?? "" }))} kind="파송자" onEdit={onEdit} onRemove={remove} onAdd={() => { append(newSender(), { shouldFocus: false }); onEdit(fields.length); }} /><div className="mx-auto mt-4 max-w-[438px]"><FieldError errors={[errors.senders?.root, ...senders.flatMap((_, index) => [errors.senders?.[index]?.name, errors.senders?.[index]?.prayer])]} /></div></>;
}

export function SenderEditor({ index }: { index: number }) {
  const [page, setPage] = useState(0);
  const { senders } = useCardPages();
  const count = senders[index]?.length ?? 1;
  const current = Math.min(page, count - 1);
  const { control, register, formState: { errors } } = useFormContext<WeeklyFormData>();
  const senderErrors = errors.senders?.[index];
  const fields = [{ name: "name", label: "이름", placeholder: "이름을 입력해 주세요" }, { name: "generation", label: "기수", placeholder: "예: 40" }, { name: "group_name", label: "소속 순", placeholder: "소속 순 이름을 입력해 주세요" }, { name: "date", label: "파송 날짜", placeholder: "날짜를 입력해 주세요" }] as const;
  return <ContentEditorLayout preview={
    <CardPreview label="파송자 카드뉴스 미리보기" navigationLabel="파송자 카드" index={current} count={count} onNavigate={setPage}>
      <div key={current} className="weekly-enter"><SenderCard index={index} page={current} /></div>
    </CardPreview>
  }>
    <section className="family-form-card sender-form-card flex flex-col gap-6" aria-label="파송자 정보 입력">
      {fields.map(({ name, label, placeholder }) => <Field key={name} className="gap-3"><FieldLabel htmlFor={`sender-${name}`}>{label}</FieldLabel>{name === "date" ? <Controller control={control} name={`senders.${index}.date`} render={({ field }) => <DatePicker id="sender-date" name={field.name} ref={field.ref} value={field.value ?? ""} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={!!senderErrors?.date} aria-describedby="sender-date-description" />} /> : <Input id={`sender-${name}`} inputMode={name === "generation" ? "numeric" : undefined} variant="filled" placeholder={placeholder} {...register(`senders.${index}.${name}`)} aria-invalid={!!senderErrors?.[name]} aria-describedby={name === "group_name" ? "sender-group_name-description" : undefined} />}{(name === "group_name" || name === "date") && <FieldDescription id={`sender-${name}-description`}>관리용 정보예요. 카드에는 표시되지 않아요.</FieldDescription>}<FieldError errors={[senderErrors?.[name]]} /></Field>)}
      <Field className="gap-3"><FieldLabel htmlFor="sender-prayer">기도제목</FieldLabel><Textarea id="sender-prayer" variant="filled" className="min-h-40" placeholder="기도제목을 한 줄에 하나씩 입력해 주세요" {...register(`senders.${index}.prayer`)} aria-invalid={!!senderErrors?.prayer} /><FieldError errors={[senderErrors?.prayer]} /></Field>
    </section>
  </ContentEditorLayout>;
}
