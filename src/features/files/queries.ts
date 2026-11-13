import "server-only";
import type { ServerDb } from "@/lib/supabase/with-user";
import { databaseFailure, failure, type Result } from "@/lib/result";
export async function photoSources(db: ServerDb, ids: string[]): Promise<Result<Record<string, string>>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return { ok: true, data: {} };
  const { data, error } = await db.from("files").select("id,path").in("id", unique).is("deleted_at", null);
  if (error) return databaseFailure(error);
  if (data.length !== unique.length) return failure("NOT_FOUND", "사진 원본을 확인해 주세요");
  const signed = await db.storage.from("uploads").createSignedUrls(data.map(f => f.path), 3600);
  if (signed.error) return databaseFailure(signed.error);
  if (!signed.data || signed.data.some(f => !f.signedUrl || f.error)) return failure("INTERNAL_ERROR", "사진을 불러오지 못했어요. 다시 시도해 주세요");
  const paths = new Map(signed.data.map(f => [f.path, f.signedUrl]));
  return { ok: true, data: Object.fromEntries(data.map(f => [f.id, paths.get(f.path)!])) };
}
