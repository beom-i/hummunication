"use server";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/supabase/with-user";
import { invalidInput, databaseFailure, type Result } from "@/lib/result";
import { recordRefSchema } from "@/features/sermon/schemas";
import { saveSenderSchema } from "./schemas";
import { getSender } from "./queries";

export async function saveSender(input: unknown) {
  const parsed = saveSenderSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { ref, values } = parsed.data;
    const { data, error } = await db.rpc("save_sender", { p_id: ref?.id ?? undefined, p_version: ref?.version ?? undefined, p_values: { people: values.people.map(person => ({ ...person, personId: person.personId ?? null, date: person.date || null })) } });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return getSender(data);
  });
}
export async function deleteSender(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_sender", { p_id: parsed.data.id, p_version: parsed.data.version });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
