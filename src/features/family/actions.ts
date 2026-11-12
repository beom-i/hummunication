"use server";
import { withUser } from "@/lib/supabase/with-user";
import { recordRefSchema } from "@/features/sermon/schemas";
import { databaseFailure, invalidInput, type Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { saveFamilySchema } from "./schemas";
import { getFamily } from "./queries";

export async function saveFamily(input: unknown) {
  const parsed = saveFamilySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { ref, values } = parsed.data;
  if (values.photo && !values.photo_id) return { ok: false as const, error: { code: "INVALID_INPUT" as const, message: "사진 업로드를 완료해 주세요", fields: { "values.photo": ["사진 업로드를 완료해 주세요"] } } };
  return withUser(async db => {
    const { name, photo_id, photo_edit, leader_name, leader_answer, members } = values;
    const stored = { name, photo_id, photo_edit, leader_name, leader_answer, members };
    const { data, error } = await db.rpc("save_family", { p_id: ref?.id ?? undefined, p_values: stored });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return getFamily(data);
  });
}
export async function deleteFamily(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_family", { p_id: parsed.data.id });
    if (!error) revalidatePath("/bulletins");
    return error ? databaseFailure(error) : { ok: true, data: null };
  });
}
