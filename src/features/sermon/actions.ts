"use server";
import { templateDocument } from "@/components/ui/rich-text-editor/schemas";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/supabase/with-user";
import { invalidInput, databaseFailure, type Result } from "@/lib/result";
import { saveSermonSchema, recordRefSchema } from "./schemas";
import { getSermon } from "./queries";
export async function saveSermon(input: unknown) {
  const parsed = saveSermonSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { ref, values } = parsed.data;
  if (values.thumbnailEdit && !values.thumbnailId) return { ok: false as const, error: { code: "INVALID_INPUT" as const, message: "사진 업로드를 완료해 주세요", fields: { "values.thumbnailEdit": ["사진 업로드를 완료해 주세요"] } } };
  return withUser(async db => {
    const { data, error } = await db.rpc("save_sermon", { p_id: ref?.id ?? undefined, p_values: { ...values, content: templateDocument(values.content), date: values.date || null } });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return getSermon(data);
  });
}
export async function deleteSermon(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_sermon", { p_id: parsed.data.id });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
