import { z } from "zod";
import type { DefaultValues } from "react-hook-form";
import { recordRefSchema } from "@/features/sermon/schemas";
export const personSchema = z.object({ name: z.string().trim().max(100, "100자 이내로 입력해 주세요"), answer: z.string().max(3000, "3,000자 이내로 입력해 주세요") });
const personCompleteSchema = personSchema.extend({ name: personSchema.shape.name.min(1, "이름을 입력해 주세요") });
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
export const cropFormSchema = z.object({ area: photoEditSchema.shape.crop, rotation: photoEditSchema.shape.rotation });
export type CropFormData = z.infer<typeof cropFormSchema>;
export const cropDefaultValues: DefaultValues<CropFormData> = { area: { x: 0, y: 0, width: 1, height: 1 }, rotation: 0 };
export const familyCompleteSchema = z.object({
  id: z.uuid().nullable().optional(),
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(100, "100자 이내로 입력해 주세요"),
  photo_id: z.uuid().nullable(),
  photo: z.string().max(7500000, "5MB 이하의 사진을 올려 주세요").refine(value => value === "" || value.startsWith("https://") || /^data:image\/(png|jpeg|webp);base64,/.test(value), "사진을 다시 올려 주세요"),
  photo_edit: photoEditSchema.nullable(),
  leader_name: personCompleteSchema.shape.name,
  leader_answer: personSchema.shape.answer,
  members: z.array(personCompleteSchema).max(30, "순원은 30명까지 입력해 주세요"),
  position: z.number().int().min(0).max(19).optional(),
});
export const familyFormSchema = familyCompleteSchema.extend({ name: personSchema.shape.name, leader_name: personSchema.shape.name, members: z.array(personSchema).max(30, "순원은 30명까지 입력해 주세요") });
export const familyStoredSchema = familyFormSchema.omit({ photo: true }).extend({ id: z.uuid(), position: z.number().int().min(0).max(19) });
export type FamilyFormData = z.infer<typeof familyFormSchema>;
export const saveFamilySchema = z.object({ ref: recordRefSchema.nullable(), values: familyFormSchema.omit({ id: true, position: true }) });
