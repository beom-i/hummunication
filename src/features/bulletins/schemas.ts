import { z } from "zod";
import type { DefaultValues } from "react-hook-form";
export const editPasswordSchema = z.object({ password: z.string().regex(/^\d{6}$/, "주보 날짜 6자리를 입력해 주세요") });
export type EditPasswordData = z.infer<typeof editPasswordSchema>;
export const editPasswordDefaults: DefaultValues<EditPasswordData> = { password: "" };
