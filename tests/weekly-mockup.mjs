import assert from "node:assert/strict";
import { senderPrayerPages } from "../src/components/weekly/sender-pagination.ts";
import { weeklyDraftSchema, weeklySchema, weeklyDefaultValues } from "../src/components/weekly/schemas.ts";

const draft = weeklyDraftSchema.parse(weeklyDefaultValues);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sections: [] }).success, true);
assert.equal(weeklySchema.safeParse({ ...draft, sections: [] }).success, false);

const senderOnly = { ...draft, sections: ["senders"], senders: [{ name: "예시 파송자", generation: "40", group_name: "예시순", date: "2026-11-15", prayer: "공동체를 위한 기도" }] };
assert.equal(weeklySchema.safeParse(senderOnly).success, true);
assert.equal(weeklySchema.safeParse({ ...senderOnly, senders: [] }).success, false);
assert.equal(weeklySchema.safeParse({ ...senderOnly, senders: [{ ...senderOnly.senders[0], prayer: "" }] }).success, false);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sermonThumbnail: "javascript:alert(1)" }).success, false);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sermonThumbnail: "data:image/png;base64,AAAA" }).success, true);

const prayer = "믿음으로 함께하는 공동체를 위해 기도합니다. ".repeat(80);
const pages = senderPrayerPages(prayer);
assert.ok(pages.length > 1);
assert.ok(pages.every(page => page.length <= 11));
assert.equal(pages.flat().map(line => line.text).join(""), prayer);
assert.deepEqual(senderPrayerPages("첫 번째 기도\n두 번째 기도").flat().map(line => line.number), [1, 2]);
assert.equal(senderPrayerPages("").length, 1);
console.log("Weekly mockup validation and lossless sender pagination passed.");

const { clearPendingWeekly, legacyDraftKey, loadPendingWeekly, savePendingWeekly } = await import("../src/components/bulletins/local-store.ts");
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const saved = { ...draft, date: "2035-01-07" };
savePendingWeekly(saved, null);
storage.set(`${legacyDraftKey}.${saved.date}`, JSON.stringify(saved));
storage.set(legacyDraftKey, JSON.stringify(saved));
clearPendingWeekly(saved.date);
assert.equal(loadPendingWeekly(saved.date), null);
assert.equal(storage.has(`${legacyDraftKey}.${saved.date}`), false, "Successful saving must remove the dated edit draft");
assert.equal(storage.has(legacyDraftKey), false);

const other = { ...draft, date: "2035-01-14" };
savePendingWeekly(other, null);
storage.set(`${legacyDraftKey}.${other.date}`, JSON.stringify(other));
storage.set(legacyDraftKey, JSON.stringify(other));
clearPendingWeekly(saved.date);
assert.deepEqual(loadPendingWeekly(other.date)?.data, other);
assert.equal(storage.has(`${legacyDraftKey}.${other.date}`), true);
assert.equal(JSON.parse(storage.get(legacyDraftKey)).date, other.date, "Saving one bulletin must preserve another bulletin's unfinished draft");
console.log("Successful saving removes only that bulletin's recovery data.");

const { weeklyValuesForSave } = await import("../src/features/weekly/client.ts");
const photo = `data:image/jpeg;base64,${Buffer.alloc(5 * 1024 * 1024).toString("base64")}`;
const photoId = "00000000-0000-4000-8000-000000000020";
const withPhotos = { ...saved, families: saved.families.map(family => ({ ...family, photo, photo_id: photoId })), sermonThumbnail: photo, sermon: { ...saved.sermon, thumbnailId: photoId } };
const compact = weeklyValuesForSave(withPhotos);
assert.equal(weeklyDraftSchema.safeParse(compact).success, true);
assert.equal(compact.families[0].photo, "");
assert.equal(compact.families[0].photo_id, photoId);
assert.equal(compact.sermonThumbnail, "");
assert.equal(compact.sermon.thumbnailId, photoId);
assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 1024 * 1024, "Uploaded image bodies must not be sent again in the save request");
assert.equal(withPhotos.families[0].photo, photo, "Preparing the request must preserve the live preview and recovery data");
const notUploaded = { ...withPhotos, families: withPhotos.families.map(family => ({ ...family, photo_id: null })), sermon: { ...withPhotos.sermon, thumbnailId: null } };
assert.equal(weeklyValuesForSave(notUploaded).families[0].photo, photo);
assert.equal(weeklyValuesForSave(notUploaded).sermonThumbnail, photo);
console.log("Save requests keep file IDs and omit uploaded photo bodies without changing previews.");
