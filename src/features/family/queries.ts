import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure } from "@/lib/result";
import { photoSources } from "@/features/files/queries";
import { familyStoredSchema } from "./schemas";

export async function getFamily(input: unknown) {
  const id = z.uuid().safeParse(input);
  if (!id.success) return invalidInput(id.error);
  return withUser(async db => {
    const { data, error } = await db.rpc("get_family", { p_id: id.data });
    if (error) return databaseFailure(error);
    const stored = familyStoredSchema.extend({ weekly_id: z.uuid().nullable() }).safeParse(data);
    if (!stored.success) return failure("INTERNAL_ERROR", "저장된 문답을 확인해 주세요");
    const row = stored.data;
    const sources = await photoSources(db, row.photo_id ? [row.photo_id] : []);
    if (!sources.ok) return sources;
    return { ok: true, data: { ...row, photo: row.photo_id ? sources.data[row.photo_id] : "" } };
  });
}
