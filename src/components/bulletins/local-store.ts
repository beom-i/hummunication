import { mockBulletins } from "@/components/home/mock-bulletins";
import { weeklyDefaultValues, weeklyDraftSchema } from "@/components/weekly/schemas";
import { bulletinIdSchema, savedBulletinSchema, savedBulletinsSchema, type SavedBulletin } from "./schemas";

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

export function findBulletin(id: string) {
  if (!bulletinIdSchema.safeParse(id).success) return null;
  return loadSavedBulletins().find(record => record.id === id) ?? sampleBulletin(id);
}

export function recentBulletins() {
  const records = new Map(mockBulletins.map(record => [record.id, sampleBulletin(record.id)!]));
  for (const record of loadSavedBulletins()) records.set(record.id, record);
  return [...records.values()].sort((a, b) => b.id.localeCompare(a.id));
}

// shortcut: date-code UI lock only; replace with server authorization when DB storage is connected.
export function allowBulletinEdit(id: string) { sessionStorage.setItem(editKey(id), "1"); }
export function canEditBulletin(id: string) { return sessionStorage.getItem(editKey(id)) === "1"; }
export function endBulletinEdit(id: string) { sessionStorage.removeItem(editKey(id)); }

export function saveBulletin(value: unknown, editingId: string | null) {
  const data = weeklyDraftSchema.parse(value);
  const records = loadSavedBulletins();
  if (editingId) {
    if (editingId !== data.date || !canEditBulletin(editingId)) throw new Error("주보 상세에서 비밀번호를 확인한 후 다시 수정해 주세요");
  } else if (records.some(record => record.id === data.date) || sampleBulletin(data.date)) {
    throw new Error("해당 날짜의 주보가 있어요. 주보 상세에서 수정해 주세요");
  }
  const record = savedBulletinSchema.parse({ id: data.date, data, updatedAt: new Date().toISOString() });
  localStorage.setItem(savedBulletinsKey, JSON.stringify([...records.filter(item => item.id !== record.id), record]));
  return record;
}
