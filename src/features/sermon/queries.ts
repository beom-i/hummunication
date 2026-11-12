import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure, type Result } from "@/lib/result";
import { sermonSchema, type Sermon } from "./schemas";
export async function getSermon(input: unknown): Promise<Result<Sermon>> {
  const id = z.uuid().safeParse(input);
  if (!id.success) return invalidInput(id.error);
  return withUser(async db => {
    const { data, error } = await db.rpc("get_sermon", { p_id: id.data });
    if (error) return databaseFailure(error);
    if (!data || typeof data !== "object" || Array.isArray(data)) return failure("NOT_FOUND", "설교를 확인해 주세요");
    const parsed = sermonSchema.safeParse({ ...data, date: data.date ?? "", thumbnailId: data.thumbnail_id ?? null });
    return parsed.success ? { ok: true, data: parsed.data } : failure("INTERNAL_ERROR", "저장된 설교를 확인해 주세요");
  });
}
