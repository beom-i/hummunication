import { z } from "zod";
import type { DefaultValues } from "react-hook-form";
import { documentFromText } from "@/components/ui/rich-text-editor/schemas";
import { weeklyDraftSchema } from "@/components/weekly/schemas";

export const legacyWeeklySchema = z.preprocess(value => {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const sermon = data.sermon && typeof data.sermon === "object" ? data.sermon as Record<string, unknown> : {};
  return { ...data, sermon: { ...sermon, bible: sermon.bible ?? sermon.passage ?? "", content: typeof sermon.content === "string" ? documentFromText(sermon.content) : sermon.content ?? sermon.document },
    groups: Array.isArray(data.groups) ? data.groups.map(group => ({ ...group, photoId: group.photoId ?? null })) : data.groups };
}, weeklyDraftSchema);

export const bulletinIdSchema = z.iso.date();
export const savedBulletinSchema = z.object({
  id: bulletinIdSchema,
  data: legacyWeeklySchema,
  updatedAt: z.iso.datetime(),
}).refine(record => record.id === record.data.date, "주보 날짜를 확인해 주세요");
export const savedBulletinsSchema = z.array(savedBulletinSchema).refine(records => new Set(records.map(record => record.id)).size === records.length, "중복된 주보가 있어요");
export type SavedBulletin = z.infer<typeof savedBulletinSchema>;

export const editPasswordSchema = z.object({ password: z.string().regex(/^\d{6}$/, "주보 날짜 6자리를 입력해 주세요") });
export type EditPasswordData = z.infer<typeof editPasswordSchema>;
export const editPasswordDefaults: DefaultValues<EditPasswordData> = { password: "" };
