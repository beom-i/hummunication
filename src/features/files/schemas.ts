import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
export const photoSchema = z.file().max(5 * 1024 * 1024, "5MB 이하의 사진을 올려 주세요").mime(["image/png", "image/jpeg", "image/webp"], "PNG, JPG, WebP 사진을 올려 주세요");

export const photoEditSchema = z.object({
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  sourceWidth: z.number().int().positive().max(50000), sourceHeight: z.number().int().positive().max(50000),
  quality: z.union([z.literal(0.85), z.literal(0.65), z.null()]).optional(),
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).strict()
    .refine(c => c.x + c.width <= 1.001 && c.y + c.height <= 1.001, "크롭 영역을 확인해 주세요"),
}).strict();
export type PhotoEdit = z.infer<typeof photoEditSchema>;
export const cropFormSchema = z.object({ area: photoEditSchema.shape.crop, rotation: photoEditSchema.shape.rotation });
export type CropFormData = z.infer<typeof cropFormSchema>;
export const cropDefaultValues: DefaultValues<CropFormData> = { area: { x: 0, y: 0, width: 1, height: 1 }, rotation: 0 };
export function hasPhotoAspect(edit: PhotoEdit, aspect: number) {
  const w = edit.rotation % 180 ? edit.sourceHeight : edit.sourceWidth;
  const h = edit.rotation % 180 ? edit.sourceWidth : edit.sourceHeight;
  return Math.abs(edit.crop.width * w / (edit.crop.height * h) - aspect) < 0.01;
}
