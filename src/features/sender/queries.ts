import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure, type Result } from "@/lib/result";
import { senderSchema, type Sender } from "./schemas";

export async function getSender(input: unknown): Promise<Result<Sender>> {
  const id = z.uuid().safeParse(input);
  if (!id.success) return invalidInput(id.error);
  return withUser(async db => {
    const { data, error } = await db.rpc("get_sender", { p_id: id.data });
    if (error) return databaseFailure(error);
    const stored = senderSchema.extend({ date: z.iso.date().nullable() }).safeParse(data);
    if (!stored.success) return failure("INTERNAL_ERROR", "저장된 파송자를 확인해 주세요");
    return { ok: true, data: { ...stored.data, date: stored.data.date ?? "" } };
  });
}
