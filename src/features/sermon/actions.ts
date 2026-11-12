"use server";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/supabase/with-user";
import { invalidInput, databaseFailure, type Result } from "@/lib/result";
import { saveSermonSchema, recordRefSchema } from "./schemas";
import { getSermon } from "./queries";
export async function saveSermon(input: unknown) {
  const parsed = saveSermonSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { ref, values } = parsed.data;
    const { data, error } = await db.rpc("save_sermon", { p_id: ref?.id ?? undefined, p_version: ref?.version ?? undefined, p_values: { ...values, date: values.date || null } });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return getSermon(data);
  });
}
export async function deleteSermon(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_sermon", { p_id: parsed.data.id, p_version: parsed.data.version });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
