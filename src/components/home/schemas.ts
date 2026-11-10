import type { DefaultValues } from "react-hook-form";
import { z } from "zod";

export const publishDateSchema = z.object({
  date: z.enum(["2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"], {
    error: "발행 날짜를 선택해 주세요",
  }),
});
export type PublishDateFormData = z.infer<typeof publishDateSchema>;
export const publishDateDefaultValues: DefaultValues<PublishDateFormData> = {
  date: "2026-11-08",
};
