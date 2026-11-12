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
  const missing = values.groups.findIndex(g => g.photo && !g.photoId);
  if (missing !== -1) return { ok: false, error: { code: "INVALID_INPUT", message: "사진 업로드를 완료해 주세요", fields: { [`values.groups.${missing}.photo`]: ["사진 업로드를 완료해 주세요"] } } };
  return withUser(async db => {
    const { error } = await db.rpc("save_weekly", {
      p_id: ref?.id ?? undefined, p_version: ref?.version ?? undefined, p_date: values.date, p_sections: values.sections,
      p_sermon: { id: ref?.sermon?.id ?? null, version: ref?.sermon?.version ?? null, values: { ...values.sermon, date: values.sermon.date || null } },
      p_family: { id: ref?.family?.id ?? null, version: ref?.family?.version ?? null, values: { groups: values.groups.map(group => ({ name: group.name, photoId: group.photoId, photoEdit: group.photoId ? group.photoEdit ?? null : null, leader: group.leader, members: group.members })) } },
      p_sender: { id: ref?.sender?.id ?? null, version: ref?.sender?.version ?? null, values: { people: (values.senders ?? []).map(person => ({ ...person, personId: person.personId ?? null, date: person.date || null })) } },
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
    const { error } = await db.rpc("delete_weekly", { p_id: parsed.data.id, p_version: parsed.data.version });
    if (error) return databaseFailure(error);
    revalidatePath("/home"); revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
