import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { databaseFailure, failure, type Result } from "@/lib/result";

export async function cleanupPhotos(db: SupabaseClient<Database>): Promise<Result<{ deleted: number }>> {
  const claimed = await db.rpc("claim_photo_cleanup");
  if (claimed.error) return databaseFailure(claimed.error);
  if (!claimed.data.length) return { ok: true, data: { deleted: 0 } };
  const removed = await db.storage.from("uploads").remove(claimed.data.map(file => file.path));
  if (removed.error) return failure("INTERNAL_ERROR", "미사용 사진을 정리하지 못했어요. 다음 정리에서 다시 시도합니다");
  const finished = await db.rpc("finish_photo_cleanup", { p_ids: claimed.data.map(file => file.id) });
  if (finished.error) return databaseFailure(finished.error);
  return { ok: true, data: { deleted: claimed.data.length } };
}
