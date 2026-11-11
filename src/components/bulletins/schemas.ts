import { z } from "zod";
import type { DefaultValues } from "react-hook-form";
import { weeklyDraftSchema } from "@/components/weekly/schemas";

export const bulletinIdSchema = z.iso.date();
export const savedBulletinSchema = z.object({
  id: bulletinIdSchema,
  data: weeklyDraftSchema,
  updatedAt: z.iso.datetime(),
}).refine(record => record.id === record.data.date, "주보 날짜를 확인해 주세요");
export const savedBulletinsSchema = z.array(savedBulletinSchema).refine(records => new Set(records.map(record => record.id)).size === records.length, "중복된 주보가 있어요");
export type SavedBulletin = z.infer<typeof savedBulletinSchema>;

export const editPasswordSchema = z.object({ password: z.string().regex(/^\d{6}$/, "주보 날짜 6자리를 입력해 주세요") });
export type EditPasswordData = z.infer<typeof editPasswordSchema>;
export const editPasswordDefaults: DefaultValues<EditPasswordData> = { password: "" };
