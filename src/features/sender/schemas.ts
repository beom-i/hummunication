import { z } from "zod";
import { recordRefSchema } from "@/features/sermon/schemas";

export const senderFormSchema = z.object({
  id: z.uuid().nullable().optional(),
  name: z.string().trim().max(100, "100자 이내로 입력해 주세요"),
  generation: z.string().regex(/^\d{0,3}$/, "기수를 숫자로 입력해 주세요"),
  group_name: z.string().trim().max(100, "100자 이내로 입력해 주세요"),
  date: z.union([z.literal(""), z.iso.date("파송 날짜를 확인해 주세요")]),
  position: z.number().int().min(0).max(19).optional(),
  prayer: z.string().max(3000, "3,000자 이내로 입력해 주세요"),
});
export const senderCompleteSchema = senderFormSchema.extend({
  name: senderFormSchema.shape.name.min(1, "이름을 입력해 주세요"),
  generation: senderFormSchema.shape.generation.min(1, "기수를 입력해 주세요"),
  prayer: senderFormSchema.shape.prayer.min(1, "기도제목을 입력해 주세요"),
});
export const senderSchema = senderFormSchema.extend({ id: z.uuid(), weekly_id: z.uuid().nullable(), position: z.number().int().min(0).max(19) });
export const saveSenderSchema = z.object({ ref: recordRefSchema.nullable(), values: senderFormSchema.omit({ id: true, position: true }) });
export type Sender = z.infer<typeof senderSchema>;
export const newSender = (): z.infer<typeof senderFormSchema> => ({ id: null, name: "", generation: "", group_name: "", date: "", prayer: "" });
