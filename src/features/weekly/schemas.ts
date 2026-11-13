import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
import { sermonFormSchema, sermonCompleteSchema, sermonDefaultValues, recordRefSchema } from "@/features/sermon/schemas";
import { familyFormSchema, familyCompleteSchema } from "@/features/family/schemas";
import { senderFormSchema, senderCompleteSchema, newSender } from "@/features/sender/schemas";

export const sectionOptions = [
  { value: "thumbnail", label: "주보 썸네일" }, { value: "cover", label: "주보 표지" },
  { value: "sermon", label: "설교 정리" }, { value: "family", label: "새가족 문답" }, { value: "senders", label: "파송자" },
] as const;
export const weeklyDraftSchema = z.object({
  date: z.iso.date("발행 날짜를 선택해 주세요"),
  sections: z.array(z.enum(["thumbnail", "cover", "sermon", "family", "senders"])).max(5).refine(items => new Set(items).size === items.length, "구성을 확인해 주세요"),
  sermon: sermonFormSchema,
  families: z.array(familyFormSchema).max(20, "순은 20개까지 입력해 주세요"),
  senders: z.array(senderFormSchema).max(20, "파송자는 20명까지 입력해 주세요").optional(),
  sermonThumbnail: familyFormSchema.shape.photo.optional(),
});
export const weeklySchema = weeklyDraftSchema.extend({
  sections: weeklyDraftSchema.shape.sections.refine(items => items.length > 0, "구성을 하나 이상 선택해 주세요"),
}).superRefine((values, ctx) => {
  if (values.sections.includes("sermon")) {
    const result = sermonCompleteSchema.safeParse(values.sermon);
    if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: ["sermon", ...issue.path] });
  }
  if (values.sections.includes("family")) {
    const result = z.array(familyCompleteSchema).min(1, "순을 하나 이상 추가해 주세요").safeParse(values.families);
    if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: ["families", ...issue.path] });
  }
  if (values.sections.includes("senders")) {
    const result = z.array(senderCompleteSchema).min(1, "파송자를 한 명 이상 추가해 주세요").safeParse(values.senders ?? []);
    if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: ["senders", ...issue.path] });
  }
});
export type WeeklyFormData = z.infer<typeof weeklyDraftSchema>;
export const weeklyRefSchema = recordRefSchema.extend({ sermon: recordRefSchema.nullable() });
export type WeeklyRef = z.infer<typeof weeklyRefSchema>;
export const saveWeeklySchema = z.object({ ref: weeklyRefSchema.nullable(), values: weeklyDraftSchema });
export const weeklyRecordSchema = z.object({ id: z.iso.date(), ref: weeklyRefSchema, data: weeklyDraftSchema, updatedAt: z.iso.datetime() });
export type WeeklyRecord = z.infer<typeof weeklyRecordSchema>;

export const newFamily = (): WeeklyFormData["families"][number] => ({
  id: null, name: "", photo: "", photo_id: null, photo_edit: null, leader_name: "", leader_answer: "",
  members: [{ name: "", answer: "" }],
});
export const weeklyDefaultValues: DefaultValues<WeeklyFormData> = {
  date: "", sections: sectionOptions.map(option => option.value),
  sermonThumbnail: "",
  sermon: sermonDefaultValues,
  families: [newFamily()],
  senders: [newSender()],
};
