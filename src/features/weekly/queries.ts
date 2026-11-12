import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure, type Result } from "@/lib/result";
import { sermonSchema, sermonFormSchema, sermonDefaultValues } from "@/features/sermon/schemas";
import { familyStoredSchema } from "@/features/family/schemas";
import { senderFormSchema } from "@/features/sender/schemas";
import { photoSources } from "@/features/files/queries";
import { weeklyRecordSchema, weeklyDraftSchema, type WeeklyRecord } from "./schemas";

const storedSchema = z.object({
  id: z.uuid(), date: z.iso.date(), updated_at: z.string(),
  sections: weeklyDraftSchema.shape.sections,
  sermon: sermonSchema.extend({ date: z.iso.date().nullable(), thumbnail_id: z.uuid().nullable() }).nullable(),
  families: z.array(familyStoredSchema).max(20),
  senders: z.array(senderFormSchema.extend({ date: z.iso.date().nullable(), id: z.uuid() })).max(20),
});
export async function getWeekly(input: unknown): Promise<Result<WeeklyRecord>> {
  const date = z.iso.date("발행 날짜를 확인해 주세요").safeParse(input);
  if (!date.success) return invalidInput(date.error);
  return withUser(async db => {
    const { data, error } = await db.rpc("get_weekly", { p_date: date.data });
    if (error) return databaseFailure(error);
    const stored = storedSchema.safeParse(data);
    if (!stored.success) return failure("INTERNAL_ERROR", "저장된 주보를 확인해 주세요");
    const row = stored.data;
    const families = row.families;
    const sources = await photoSources(db, [...families.flatMap(g => g.photo_id ? [g.photo_id] : []), ...(row.sermon?.thumbnail_id ? [row.sermon.thumbnail_id] : [])]);
    if (!sources.ok) return sources;
    const parsed = weeklyRecordSchema.safeParse({
      id: row.date, updatedAt: new Date(row.updated_at).toISOString(),
      ref: { id: row.id, sermon: row.sermon ? { id: row.sermon.id } : null },
      data: {
        date: row.date, sections: row.sections,
        sermon: row.sermon ? { ...row.sermon, date: row.sermon.date ?? "", thumbnailId: row.sermon.thumbnail_id } : sermonFormSchema.parse(sermonDefaultValues),
        sermonThumbnail: row.sermon?.thumbnail_id ? sources.data[row.sermon.thumbnail_id] : "",
        families: families.map(g => ({ ...g, photo: g.photo_id ? sources.data[g.photo_id] : "" })),
        senders: row.senders.map(person => ({ ...person, date: person.date ?? "" })) ?? [],
      },
    });
    return parsed.success ? { ok: true, data: parsed.data } : failure("INTERNAL_ERROR", "저장된 주보를 확인해 주세요");
  });
}
export async function listWeekly() {
  return withUser(async db => {
    const { data, error } = await db.from("weekly").select("id,date,updated_at").is("deleted_at", null).order("date", { ascending: false });
    return error ? databaseFailure(error) : { ok: true as const, data };
  });
}
