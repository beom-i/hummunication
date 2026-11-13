"use server";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { invalidInput, databaseFailure, failure, type Result } from "@/lib/result";
import { photoSchema } from "./schemas";

export async function uploadPhoto(input: unknown): Promise<Result<{ id: string }>> {
  const form = z.instanceof(FormData).safeParse(input);
  if (!form.success) return invalidInput(form.error);
  const parsed = photoSchema.safeParse(form.data.get("photo"));
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async (db, userId) => {
    const file = parsed.data;
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
    if (!(file.type === "image/png" && png || file.type === "image/jpeg" && jpeg || file.type === "image/webp" && webp)) return failure("INVALID_INPUT", "사진 파일 형식을 확인해 주세요");
    let extension = "webp";
    if (png) extension = "png";
    else if (jpeg) extension = "jpg";
    const path = `${userId}/photos/${crypto.randomUUID()}.${extension}`;
    const uploaded = await db.storage.from("uploads").upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) return databaseFailure(uploaded.error);
    const { data, error } = await db.rpc("register_file", { p_path: path });
    if (error) return databaseFailure(error);
    return { ok: true, data: { id: data } };
  });
}
export async function deleteFile(input: unknown): Promise<Result<null>> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_file", { p_id: parsed.data });
    return error ? databaseFailure(error) : { ok: true, data: null };
  });
}
