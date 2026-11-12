import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
import { weeklySchema as baseSchema, weeklyDraftSchema as baseDraftSchema, weeklyDefaultValues as baseDefaults, newFamily } from "@/features/weekly/schemas";
import { cropFormSchema } from "@/features/files/schemas";

export { sectionOptions, newFamily } from "@/features/weekly/schemas";
export { photoEditSchema, cropFormSchema, cropDefaultValues, type PhotoEdit, type CropFormData } from "@/features/family/schemas";
export { photoSchema } from "@/features/files/schemas";

export { senderFormSchema as senderSchema, senderCompleteSchema, newSender } from "@/features/sender/schemas";
import { newSender } from "@/features/sender/schemas";
export const weeklyDraftSchema = baseDraftSchema;
export const weeklySchema = baseSchema;
export type WeeklyFormData = z.infer<typeof weeklyDraftSchema>;
export const photoEditorSchema = cropFormSchema.extend({ optimization: z.enum(["original", "balanced", "small"]) });
export type PhotoEditorData = z.infer<typeof photoEditorSchema>;
export const photoEditorDefaultValues: DefaultValues<PhotoEditorData> = { optimization: "original", rotation: 0, area: { x: 0, y: 0, width: 1, height: 1 } };
export const weeklyDefaultValues: DefaultValues<WeeklyFormData> = {
  ...baseDefaults,
  sections: ["thumbnail", "cover", "sermon", "family"],
  sermonThumbnail: "",
  families: [{ ...newFamily(0), name: "" }],
  senders: [newSender()],
};
