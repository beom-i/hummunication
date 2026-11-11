import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
import { richDocumentSchema, documentFromText, documentText } from "@/components/ui/rich-text-editor/schemas";
const publishDateSchema = z.object({
  date: z.enum(["2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"], { error: "발행 날짜를 선택해 주세요" }),
});

export const sectionOptions = [
  { value: "thumbnail", label: "주보 썸네일" },
  { value: "cover", label: "주보 표지" },
  { value: "sermon", label: "설교 정리" },
  { value: "family", label: "새가족 문답" },
  { value: "senders", label: "파송자" },
] as const;

const required = z.string().trim().min(1, "내용을 입력해 주세요");
export const memberSchema = z.object({ name: required, answer: z.string().max(3000, "3,000자 이내로 입력해 주세요") });
export const photoEditSchema = z.object({
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  sourceWidth: z.number().int().positive().max(50000), sourceHeight: z.number().int().positive().max(50000),
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) })
    .refine(c => c.x + c.width <= 1.001 && c.y + c.height <= 1.001, "크롭 영역을 확인해 주세요"),
}).refine(edit => {
  const w = edit.rotation % 180 ? edit.sourceHeight : edit.sourceWidth;
  const h = edit.rotation % 180 ? edit.sourceWidth : edit.sourceHeight;
  return Math.abs((edit.crop.width * w) / (edit.crop.height * h) - 119 / 71) < 0.01;
}, "사진 비율을 확인해 주세요");
export type PhotoEdit = z.infer<typeof photoEditSchema>;
export const cropFormSchema = z.object({ position: z.object({ x: z.number(), y: z.number() }), zoom: z.number().min(1).max(5), rotation: photoEditSchema.shape.rotation });
export type CropFormData = z.infer<typeof cropFormSchema>;
export const cropDefaultValues: DefaultValues<CropFormData> = { position: { x: 0, y: 0 }, zoom: 1, rotation: 0 };
export const familySchema = z.object({
  name: required,
  photo: z.string().refine((value) => value === "" || /^data:image\/(png|jpeg|webp);base64,/.test(value), "사진을 다시 올려 주세요"),
  photoEdit: photoEditSchema.optional(),
  leader: memberSchema,
  members: z.array(memberSchema).max(30, "순원은 30명까지 입력해 주세요"),
});
export const weeklySchema = publishDateSchema.extend({
  sections: z.array(z.enum(["thumbnail", "cover", "sermon", "family", "senders"])).min(1, "구성을 하나 이상 선택해 주세요"),
  sermon: z.object({ date: z.iso.date("날짜를 확인해 주세요"), speaker: required, title: required, passage: required, document: richDocumentSchema.refine(doc => documentText(doc).trim().length > 0, "정리 내용을 입력해 주세요") }),
  groups: z.array(familySchema).min(1, "순을 하나 이상 추가해 주세요").max(20, "순은 20개까지 입력해 주세요"),
});
export const photoSchema = z.file().max(5 * 1024 * 1024, "5MB 이하의 사진을 올려 주세요").mime(["image/png", "image/jpeg", "image/webp"], "PNG, JPG, WebP 사진을 올려 주세요");
// A draft can contain unfinished fields; navigation uses the stricter weeklySchema.
const draftMemberSchema = memberSchema.extend({ name: z.string() });
export const weeklyDraftSchema = weeklySchema.extend({
  sermon: z.preprocess(value => {
    if (value && typeof value === "object" && "content" in value && !("document" in value) && typeof value.content === "string") return { ...value, document: documentFromText(value.content) };
    return value;
  }, weeklySchema.shape.sermon.extend({ date: z.string(), speaker: z.string(), title: z.string(), passage: z.string(), document: richDocumentSchema })),
  groups: z.array(familySchema.extend({ name: z.string(), leader: draftMemberSchema, members: z.array(draftMemberSchema).max(30) })).min(1).max(20),
  sections: z.array(weeklySchema.shape.sections.element),
});
export type WeeklyFormData = z.infer<typeof weeklySchema>;
export const newFamily = (index: number): WeeklyFormData["groups"][number] => ({
  name: `${index + 1} 순`, photo: "", leader: { name: "순장", answer: "기쁨도 슬픔도 함께하며 서로에게 힘이 되어줄 수 있는 믿음의 동역자가 있어서!" },
  members: [{ name: "순원 1", answer: "" }],
});
export const weeklyDefaultValues: DefaultValues<WeeklyFormData> = {
  date: "2026-11-08", sections: sectionOptions.map((option) => option.value),
  sermon: {
    date: "2026-11-08", speaker: "담당 목사님", title: "기드온 Part 2, 하나님이 하십니다", passage: "사사기 7:1-8",
    document: documentFromText("기드온에게 모인 사람은 삼만 이천 명이었습니다. 그런데 하나님께서는 ‘너를 따르는 백성이 너무 많다’고 말씀하십니다.\n\n두려워 떠는 자를 돌려보내고, 물가에서 다시 사람을 고릅니다. 결국 남은 사람은 삼백 명. 이스라엘이 스스로 자랑하지 못하게 하시려는 것입니다.\n\n우리는 숫자와 조건이 갖춰져야 무언가를 할 수 있다고 생각합니다. 그러나 하나님의 방법은 달랐습니다. 하나님을 의지하며 믿음으로 나아갑니다."),
  },
  groups: [newFamily(0), newFamily(1)],
};
