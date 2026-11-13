import "server-only";
import { createClient } from "./server";
import { failure, type Result } from "@/lib/result";
import { sessionError } from "@/features/auth/utils/session";
export type ServerDb = Awaited<ReturnType<typeof createClient>>;

export async function withUser<T>(work: (db: ServerDb, userId: string) => Promise<Result<T>>): Promise<Result<T>> {
  try {
    const db = await createClient();
    const { data, error } = await db.auth.getClaims();
    const userId = data?.claims?.sub;
    const authError = sessionError(data?.claims, error);
    if (authError) return { ok: false, error: authError };
    return await work(db, userId!);
  } catch {
    return failure("INTERNAL_ERROR", "연결을 확인한 뒤 다시 시도해 주세요");
  }
}
