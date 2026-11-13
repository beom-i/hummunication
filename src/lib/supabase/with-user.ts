import "server-only";
import { createClient } from "./server";
import { failure, type Result } from "@/lib/result";
export type ServerDb = Awaited<ReturnType<typeof createClient>>;

export async function withUser<T>(work: (db: ServerDb, userId: string) => Promise<Result<T>>): Promise<Result<T>> {
  try {
    const db = await createClient();
    const { data, error } = await db.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || !userId) return failure("UNAUTHORIZED", "로그인한 뒤 다시 시도해 주세요");
    if (data?.claims?.is_anonymous === true) return failure("FORBIDDEN", "팀원 계정으로 로그인해 주세요");
    return await work(db, userId);
  } catch {
    return failure("INTERNAL_ERROR", "연결을 확인한 뒤 다시 시도해 주세요");
  }
}
