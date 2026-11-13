import { mockBulletins } from "@/components/home/mock-bulletins";
import { weeklyDefaultValues, weeklyDraftSchema } from "@/components/weekly/schemas";
import { z } from "zod";
import { weeklyRefSchema, type WeeklyRef, type WeeklyFormData } from "@/features/weekly/schemas";
import { legacyWeeklySchema } from "./schemas";
import { bulletinIdSchema, savedBulletinsSchema, type SavedBulletin } from "./schemas";

export const savedBulletinsKey = "hummunication.weekly.saved";
export const legacyDraftKey = "hummunication.weekly-draft";
const editKey = (id: string) => `hummunication.weekly.edit.${id}`;

export function loadSavedBulletins(): SavedBulletin[] {
  const value = localStorage.getItem(savedBulletinsKey);
  if (!value) return [];
  try { return savedBulletinsSchema.parse(JSON.parse(value)); }
  catch { throw new Error("저장된 주보를 읽지 못했어요. 원본은 브라우저에 남아 있어요"); }
}

export function sampleBulletin(id: string): SavedBulletin | null {
  if (!mockBulletins.some(record => record.id === id)) return null;
  const data = weeklyDraftSchema.parse({ ...weeklyDefaultValues, date: id, sermon: { ...weeklyDefaultValues.sermon, date: id } });
  return { id, data, updatedAt: `${id}T00:00:00.000Z` };
}

export function markBulletinMigrated(id: string) { localStorage.setItem(`hummunication.weekly.migrated.${id}`, "1"); }
export function isBulletinMigrated(id: string) { return localStorage.getItem(`hummunication.weekly.migrated.${id}`) === "1"; }

export function findBulletin(id: string) {
  if (isBulletinMigrated(id)) return null;
  if (!bulletinIdSchema.safeParse(id).success) return null;
  return loadSavedBulletins().find(record => record.id === id) ?? sampleBulletin(id);
}

export function recentBulletins() {
  const records = new Map(mockBulletins.map(record => [record.id, sampleBulletin(record.id)!]));
  for (const record of loadSavedBulletins()) records.set(record.id, record);
  return [...records.values()].filter(record => !isBulletinMigrated(record.id)).sort((a, b) => b.id.localeCompare(a.id));
}

// shortcut: date-code UI lock only; replace with server authorization when DB storage is connected.
export function allowBulletinEdit(id: string) { sessionStorage.setItem(editKey(id), "1"); }
export function canEditBulletin(id: string) { return sessionStorage.getItem(editKey(id)) === "1"; }
export function endBulletinEdit(id: string) { sessionStorage.removeItem(editKey(id)); }


const pendingKey = (date: string) => `hummunication.weekly.pending.${date}`;
const pendingSchema = z.object({ data: legacyWeeklySchema, ref: weeklyRefSchema.nullable() });
export function savePendingWeekly(data: WeeklyFormData, ref: WeeklyRef | null) {
  try { localStorage.setItem(pendingKey(data.date), JSON.stringify({ data, ref })); } catch { /* The live form remains intact when browser storage is full. */ }
}
export function loadPendingWeekly(date: string) {
  const raw = localStorage.getItem(pendingKey(date));
  if (!raw) return null;
  try { const parsed = pendingSchema.safeParse(JSON.parse(raw)); return parsed.success && parsed.data.data.date === date ? parsed.data : null; } catch { return null; }
}
export function clearPendingWeekly(date: string) {
  try {
    localStorage.removeItem(pendingKey(date));
    localStorage.removeItem(`${legacyDraftKey}.${date}`);
    const draft = localStorage.getItem(legacyDraftKey);
    if (draft && JSON.parse(draft)?.date === date) localStorage.removeItem(legacyDraftKey);
  } catch { /* Server success must not become a failure because local cleanup is unavailable. */ }
}
