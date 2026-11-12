import type { DefaultValues } from "react-hook-form";
import type { z } from "zod";
import { weeklySchema as baseSchema, weeklyDraftSchema as baseDraftSchema, weeklyDefaultValues as baseDefaults, newFamily } from "@/features/weekly/schemas";

export { sectionOptions, newFamily } from "@/features/weekly/schemas";
export { photoEditSchema, cropFormSchema, cropDefaultValues, type PhotoEdit, type CropFormData } from "@/features/family/schemas";
export { photoSchema } from "@/features/files/schemas";

export { senderPersonSchema as senderSchema, senderPersonCompleteSchema as senderCompleteSchema, newSender } from "@/features/sender/schemas";
import { newSender } from "@/features/sender/schemas";
export const weeklyDraftSchema = baseDraftSchema;
export const weeklySchema = baseSchema;
export type WeeklyFormData = z.infer<typeof weeklyDraftSchema>;
export const weeklyDefaultValues: DefaultValues<WeeklyFormData> = {
  ...baseDefaults,
  sections: ["thumbnail", "cover", "sermon", "family"],
  sermonThumbnail: "",
  groups: [{ ...newFamily(0), name: "" }],
  senders: [newSender()],
};
