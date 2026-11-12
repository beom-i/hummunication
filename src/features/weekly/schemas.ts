import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
import { documentFromText } from "@/components/ui/rich-text-editor/schemas";
import { sermonFormSchema, sermonCompleteSchema, recordRefSchema } from "@/features/sermon/schemas";
import { familyFormSchema, familyCompleteSchema } from "@/features/family/schemas";
import { senderFormSchema, senderCompleteSchema } from "@/features/sender/schemas";

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

export const newFamily = (index: number): WeeklyFormData["families"][number] => ({
  id: null, name: `${index + 1} 순`, photo: "", photo_id: null, photo_edit: null, leader_name: "순장", leader_answer: "기쁨도 슬픔도 함께하며 서로에게 힘이 되어줄 수 있는 믿음의 동역자가 있어서!",
  members: [{ name: "순원 1", answer: "" }],
});
export const weeklyDefaultValues: DefaultValues<WeeklyFormData> = {
  date: "2026-11-08", sections: sectionOptions.map((option) => option.value),
  sermon: {
    date: "2026-11-08", speaker: "담당 목사님", title: "기드온 Part 2, 하나님이 하십니다", bible: "사사기 7:1-8",
    content: documentFromText("기드온에게 모인 사람은 삼만 이천 명이었습니다. 그런데 하나님께서는 ‘너를 따르는 백성이 너무 많다’고 말씀하십니다.\n\n두려워 떠는 자를 돌려보내고, 물가에서 다시 사람을 고릅니다. 결국 남은 사람은 삼백 명. 이스라엘이 스스로 자랑하지 못하게 하시려는 것입니다.\n\n우리는 숫자와 조건이 갖춰져야 무언가를 할 수 있다고 생각합니다. 그러나 하나님의 방법은 달랐습니다. 하나님을 의지하며 믿음으로 나아갑니다."),
  },
  families: [newFamily(0), newFamily(1)],
};
