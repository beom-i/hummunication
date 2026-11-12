"use server";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, type Result } from "@/lib/result";
import { recordRefSchema } from "@/features/sermon/schemas";
import { getWeekly, listWeekly } from "./queries";
import { saveWeeklySchema, type WeeklyRecord } from "./schemas";

export async function loadWeekly(date: unknown) { return getWeekly(date); }
export async function loadWeeklyList() { return listWeekly(); }
export async function saveWeekly(input: unknown): Promise<Result<WeeklyRecord>> {
  const parsed = saveWeeklySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { ref, values } = parsed.data;
  if (values.sermonThumbnail && !values.sermon.thumbnailId) return { ok: false, error: { code: "INVALID_INPUT", message: "썸네일 업로드를 완료해 주세요", fields: { "values.sermonThumbnail": ["썸네일 업로드를 완료해 주세요"] } } };
  const missing = values.families.findIndex(g => g.photo && !g.photo_id);
  if (missing !== -1) return { ok: false, error: { code: "INVALID_INPUT", message: "사진 업로드를 완료해 주세요", fields: { [`values.families.${missing}.photo`]: ["사진 업로드를 완료해 주세요"] } } };
  return withUser(async db => {
    const { error } = await db.rpc("save_weekly", {
      p_id: ref?.id ?? undefined, p_date: values.date, p_sections: values.sections,
      p_sermon: { id: ref?.sermon?.id ?? null, values: { ...values.sermon, date: values.sermon.date || null } },
      p_families: values.families.map(({ id, name, photo_id, photo_edit, leader_name, leader_answer, members }) => ({ id: id ?? null, name, photo_id, photo_edit: photo_id ? photo_edit : null, leader_name, leader_answer, members })),
      p_senders: (values.senders ?? []).map(({ id, name, generation, group_name, date, prayer }) => ({ id: id ?? null, name, generation, group_name, date: date || null, prayer })),
    });
    if (error) return databaseFailure(error);
    revalidatePath("/home"); revalidatePath("/bulletins");
    return getWeekly(values.date);
  });
}
export async function deleteWeekly(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_weekly", { p_id: parsed.data.id });
    if (error) return databaseFailure(error);
    revalidatePath("/home"); revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
