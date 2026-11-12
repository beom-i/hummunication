"use server";
import { withUser } from "@/lib/supabase/with-user";
import { recordRefSchema } from "@/features/sermon/schemas";
import { databaseFailure, invalidInput, type Result } from "@/lib/result";
export async function deleteFamily(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_family", { p_id: parsed.data.id, p_version: parsed.data.version });
    return error ? databaseFailure(error) : { ok: true, data: null };
  });
}
