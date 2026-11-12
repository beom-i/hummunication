import { z } from "zod";
import { photoEditSchema, hasPhotoAspect } from "@/features/files/schemas";
import type { DefaultValues } from "react-hook-form";
import { richDocumentSchema, documentFromText, documentText } from "@/components/ui/rich-text-editor/schemas";

export const sermonFormSchema = z.object({
  date: z.union([z.literal(""), z.iso.date("설교 날짜를 확인해 주세요")]),
  speaker: z.string().trim().max(100, "100자 이내로 입력해 주세요"),
  title: z.string().trim().max(200, "200자 이내로 입력해 주세요"),
  bible: z.string().trim().max(200, "200자 이내로 입력해 주세요"),
  content: richDocumentSchema,
  thumbnailId: z.uuid().nullable().optional(),
  thumbnailEdit: photoEditSchema.refine(edit => hasPhotoAspect(edit, 16 / 9), "사진 비율을 확인해 주세요").nullish(),
});
export type SermonFormData = z.infer<typeof sermonFormSchema>;
export const sermonDefaultValues: DefaultValues<SermonFormData> = { date: "", speaker: "", title: "", bible: "", content: documentFromText("") };
export const sermonCompleteSchema = sermonFormSchema.extend({
  date: z.iso.date("설교 날짜를 선택해 주세요"),
  speaker: sermonFormSchema.shape.speaker.min(1, "설교자를 입력해 주세요"),
  title: sermonFormSchema.shape.title.min(1, "설교 제목을 입력해 주세요"),
  bible: sermonFormSchema.shape.bible.min(1, "성경 본문을 입력해 주세요"),
  content: richDocumentSchema.refine(doc => documentText(doc).trim().length > 0, "정리 내용을 입력해 주세요"),
});
export const recordRefSchema = z.object({ id: z.uuid() });
export const nullableRecordRefSchema = recordRefSchema.nullable();
export const sermonSchema = sermonFormSchema.extend(recordRefSchema.shape);
export type Sermon = z.infer<typeof sermonSchema>;
export const saveSermonSchema = z.object({ ref: nullableRecordRefSchema, values: sermonFormSchema });
