import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure, type Result } from "@/lib/result";
import { sermonSchema, sermonFormSchema, sermonDefaultValues } from "@/features/sermon/schemas";
import { familyStoredSchema } from "@/features/family/schemas";
import { senderSchema, senderPersonSchema } from "@/features/sender/schemas";
import { photoSources } from "@/features/files/queries";
import { weeklyRecordSchema, weeklyDraftSchema, type WeeklyRecord } from "./schemas";

const storedSchema = z.object({
  id: z.uuid(), date: z.iso.date(), version: z.number().int().positive(), updated_at: z.string(),
  sections: weeklyDraftSchema.shape.sections,
  sermon: sermonSchema.extend({ date: z.iso.date().nullable(), thumbnail_id: z.uuid().nullable() }).nullable(),
  family: familyStoredSchema.extend({ id: z.uuid(), version: z.number().int().positive() }).nullable(),
  sender: senderSchema.extend({ people: z.array(senderPersonSchema.extend({ date: z.iso.date().nullable(), personId: z.uuid() })).max(20) }).nullable(),
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
    const groups = row.family?.groups ?? [];
    const sources = await photoSources(db, [...groups.flatMap(g => g.photoId ? [g.photoId] : []), ...(row.sermon?.thumbnail_id ? [row.sermon.thumbnail_id] : [])]);
    if (!sources.ok) return sources;
    const parsed = weeklyRecordSchema.safeParse({
      id: row.date, updatedAt: new Date(row.updated_at).toISOString(),
      ref: { id: row.id, version: row.version, sermon: row.sermon ? { id: row.sermon.id, version: row.sermon.version } : null, family: row.family ? { id: row.family.id, version: row.family.version } : null, sender: row.sender ? { id: row.sender.id, version: row.sender.version } : null },
      data: {
        date: row.date, sections: row.sections,
        sermon: row.sermon ? { ...row.sermon, date: row.sermon.date ?? "", thumbnailId: row.sermon.thumbnail_id } : sermonFormSchema.parse(sermonDefaultValues),
        sermonThumbnail: row.sermon?.thumbnail_id ? sources.data[row.sermon.thumbnail_id] : "",
        groups: groups.map(g => ({ ...g, photo: g.photoId ? sources.data[g.photoId] : "", photoEdit: g.photoEdit ?? undefined })),
        senders: row.sender?.people.map(person => ({ ...person, date: person.date ?? "" })) ?? [],
      },
    });
    return parsed.success ? { ok: true, data: parsed.data } : failure("INTERNAL_ERROR", "저장된 주보를 확인해 주세요");
  });
}
export async function listWeekly() {
  return withUser(async db => {
    const { data, error } = await db.from("weekly").select("id,date,version,updated_at").is("deleted_at", null).order("date", { ascending: false });
    return error ? databaseFailure(error) : { ok: true as const, data };
  });
}
