import type { DefaultValues } from "react-hook-form";
import { z } from "zod";
import { cropFormSchema } from "../schemas";
export type { PhotoEdit } from "../schemas";

export const photoEditorSchema = cropFormSchema.extend({ optimization: z.enum(["original", "balanced", "small"]) });
export type PhotoEditorData = z.infer<typeof photoEditorSchema>;
export const photoEditorDefaultValues: DefaultValues<PhotoEditorData> = { optimization: "original", rotation: 0, area: { x: 0, y: 0, width: 1, height: 1 } };
