"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentEntryList } from "./content-entry-list";
import { newSender, type WeeklyFormData } from "./schemas";
import { CardTextRows, useCardPages } from "./card-pages";
import { TemplateAsset, TemplateFrame } from "./template-frame";

export function SenderCard({ index, page = 0 }: { index: number; page?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const sender = useWatch({ control, name: `senders.${index}` });
  const { senders } = useCardPages();
  return <TemplateFrame label="파송자 카드뉴스" className="sender-card">
    <TemplateAsset name="sender-art.png" x={0} y={0} width={720} height={900} />
    <p className="sender-card-name" data-fit-width data-fit-text>{sender?.generation && `${sender.generation}기 `}{sender?.name || "이름"}</p>
    <div className="sender-card-prayers"><CardTextRows rows={senders[index]?.[page] ?? []} /></div>
  </TemplateFrame>;
}

export function SenderList({ onEdit }: { onEdit: (index: number) => void }) {
  const { control, formState: { errors } } = useFormContext<WeeklyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "senders" });
  const senders = useWatch({ control, name: "senders" }) ?? [];
  return <><ContentEntryList entries={fields.map((field, index) => ({ id: field.id, name: senders[index]?.name ?? "" }))} kind="파송자" onEdit={onEdit} onRemove={remove} onAdd={() => { append(newSender(), { shouldFocus: false }); onEdit(fields.length); }} /><div className="mx-auto mt-4 max-w-[438px]"><FieldError errors={[errors.senders?.root, ...senders.flatMap((_, index) => [errors.senders?.[index]?.name, errors.senders?.[index]?.prayer])]} /></div></>;
}

export function SenderEditor({ index, onNavigate, count }: { index: number; onNavigate: (index: number) => void; count: number }) {
  const { register, formState: { errors } } = useFormContext<WeeklyFormData>();
  const senderErrors = errors.senders?.[index];
  const fields = [{ name: "name", label: "이름", placeholder: "이름을 입력해 주세요" }, { name: "generation", label: "기수", placeholder: "숫자를 입력해 주세요" }, { name: "group_name", label: "소속 순", placeholder: "그룹 / 다락방 / 순" }, { name: "date", label: "파송 날짜", placeholder: "날짜를 입력해 주세요" }] as const;
  return <div className="weekly-centered family-detail-layout mx-auto mt-[60px] w-full max-w-[1112px]">
    <section className="rounded-2xl border bg-card p-5" aria-label="파송자 카드뉴스 미리보기"><h2 className="mb-4 text-base font-bold">카드뉴스 미리보기</h2><div className="relative px-14"><Button variant="outline" size="icon-lg" className="preview-nav left-0 rounded-full" aria-label="이전 파송자" disabled={index === 0} onClick={() => onNavigate(index - 1)}><ChevronLeft /></Button><SenderCard index={index} /><Button variant="outline" size="icon-lg" className="preview-nav right-0 rounded-full" aria-label="다음 파송자" disabled={index + 1 >= count} onClick={() => onNavigate(index + 1)}><ChevronRight /></Button></div></section>
    <section className="family-form-card flex flex-col gap-6" aria-label="파송자 정보 입력">
      {fields.map(({ name, label, placeholder }) => <Field key={name} className="gap-3"><FieldLabel htmlFor={`sender-${name}`}>{label}</FieldLabel><Input id={`sender-${name}`} type={name === "date" ? "date" : "text"} inputMode={name === "generation" ? "numeric" : undefined} variant="filled" placeholder={placeholder} {...register(`senders.${index}.${name}`)} aria-invalid={!!senderErrors?.[name]} /><FieldError errors={[senderErrors?.[name]]} /></Field>)}
      <Field className="gap-3"><FieldLabel htmlFor="sender-prayer">기도제목</FieldLabel><Textarea id="sender-prayer" variant="filled" className="min-h-40" placeholder="기도제목을 입력해 주세요" {...register(`senders.${index}.prayer`)} aria-invalid={!!senderErrors?.prayer} /><FieldError errors={[senderErrors?.prayer]} /></Field>
    </section>
  </div>;
}
