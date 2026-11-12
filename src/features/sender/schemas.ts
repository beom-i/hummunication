import { z } from "zod";
import { recordRefSchema } from "@/features/sermon/schemas";

export const senderPersonSchema = z.object({
  personId: z.uuid().nullable().optional(),
  name: z.string().trim().max(100, "100자 이내로 입력해 주세요"),
  generation: z.string().regex(/^\d{0,3}$/, "기수를 숫자로 입력해 주세요"),
  group: z.string().trim().max(100, "100자 이내로 입력해 주세요"),
  date: z.union([z.literal(""), z.iso.date("파송 날짜를 확인해 주세요")]),
  prayer: z.string().max(3000, "3,000자 이내로 입력해 주세요"),
});
export const senderPersonCompleteSchema = senderPersonSchema.extend({
  name: senderPersonSchema.shape.name.min(1, "이름을 입력해 주세요"),
  prayer: senderPersonSchema.shape.prayer.min(1, "기도제목을 입력해 주세요"),
});
export const senderFormSchema = z.object({ people: z.array(senderPersonSchema).max(20, "파송자는 20명까지 입력해 주세요") });
export const senderSchema = senderFormSchema.extend(recordRefSchema.shape);
export const saveSenderSchema = z.object({ ref: recordRefSchema.nullable(), values: senderFormSchema });
export type Sender = z.infer<typeof senderSchema>;
export const newSender = (): z.infer<typeof senderPersonSchema> => ({ personId: null, name: "", generation: "", group: "", date: "", prayer: "" });
