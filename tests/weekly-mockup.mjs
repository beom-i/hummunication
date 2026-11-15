import assert from "node:assert/strict";
import { paginateCardRows } from "../src/features/weekly/utils/card-pagination.ts";
import { weeklyDraftSchema, weeklySchema, weeklyDefaultValues, sectionOptions, newFamily } from "../src/features/weekly/schemas.ts";
import { documentText } from "../src/components/ui/rich-text-editor/schemas.ts";

const draft = weeklyDraftSchema.parse({ ...weeklyDefaultValues, date: "2035-01-07", sermon: { ...weeklyDefaultValues.sermon, date: "2035-01-07" } });
assert.deepEqual(draft.sections, sectionOptions.map(option => option.value), "All five output types must start selected");
assert.equal(weeklyDefaultValues.date, "", "Publication dates must be initialized from the current Korean week, never a mock date");
assert.deepEqual([draft.sermon.speaker, draft.sermon.title, draft.sermon.bible, documentText(draft.sermon.content), draft.sermonThumbnail], ["", "", "", "", ""]);
assert.equal(weeklySchema.safeParse(draft).success, false, "A new bulletin must require user content before export");
for (const family of [draft.families[0], newFamily()]) {
  assert.deepEqual([family.name, family.leader_name, family.leader_answer, family.photo], ["", "", "", ""]);
  assert.deepEqual(family.members, [{ name: "", answer: "" }], "New and added groups must contain an empty input row, never example names");
}
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sections: [] }).success, true);
assert.equal(weeklySchema.safeParse({ ...draft, sections: [] }).success, false);

const senderOnly = { ...draft, sections: ["senders"], senders: [{ name: "예시 파송자", generation: "40", group_name: "예시순", date: "2026-11-15", prayer: "공동체를 위한 기도" }] };
assert.equal(weeklySchema.safeParse(senderOnly).success, true);
const missingGeneration = { ...senderOnly, senders: [{ ...senderOnly.senders[0], generation: "" }] };
assert.equal(weeklySchema.safeParse(missingGeneration).success, false, "Sender generation is required before completing the content step");
assert.equal(weeklyDraftSchema.safeParse(missingGeneration).success, true, "Incomplete sender details must remain saveable as a draft");
assert.equal(weeklySchema.safeParse({ ...senderOnly, senders: [] }).success, false);
assert.equal(weeklySchema.safeParse({ ...senderOnly, senders: [{ ...senderOnly.senders[0], prayer: "" }] }).success, false);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sermonThumbnail: "javascript:alert(1)" }).success, false);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sermonThumbnail: "data:image/png;base64,AAAA" }).success, true);

// Exercise page boundaries independently of the browser's font metrics.
const originalDocument = globalThis.document;
globalThis.document = { createElement: () => ({ children: [], style: {}, textContent: "", append(...nodes) { this.children.push(...nodes); } }) };
const measure = {
  rows: [], replaceChildren(...rows) { this.rows = rows; },
  getBoundingClientRect() { return { height: this.rows.reduce((sum, row) => sum + Math.max(1, Math.ceil(Array.from(row.children[1].textContent).length / 20)) * 10, 0) + Math.max(0, this.rows.length - 1) * 4 }; },
};
const rows = [{ label: "순장", text: "믿음으로 함께 🌿 ".repeat(90) + "끝 문장" }, { label: "순원", text: "<script>태그도 글자로 남아요</script>" }, { label: "빈 답변", text: "" }];
const textPages = paginateCardRows(rows, measure, 70);
assert.ok(textPages.length > 1);
for (const row of rows) assert.equal(textPages.flat().filter(part => part.label === row.label).map(part => part.text).join(""), row.text, "Pagination must preserve every character, including the last sentence");
assert.deepEqual(paginateCardRows([], measure, 70), [[]]);
globalThis.document = originalDocument;
console.log("Weekly validation and lossless card pagination passed.");

const saved = { ...draft, date: "2035-01-07" };
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
assert.equal(withPhotos.families[0].photo, photo, "Preparing the request must preserve the live preview");
const notUploaded = { ...withPhotos, families: withPhotos.families.map(family => ({ ...family, photo_id: null })), sermon: { ...withPhotos.sermon, thumbnailId: null } };
assert.equal(weeklyValuesForSave(notUploaded).families[0].photo, photo);
assert.equal(weeklyValuesForSave(notUploaded).sermonThumbnail, photo);
console.log("Save requests keep file IDs and omit uploaded photo bodies without changing previews.");

const { photoOutputSize, photoSizeLabel, preparePhoto } = await import("../src/features/files/utils/photo-optimization.ts");
await assert.rejects(preparePhoto("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E", 0.85), /사진 파일 형식을 확인해 주세요/, "Only raster photo bytes may reach an exported image source");
const browser = { window: globalThis.window, document: globalThis.document, FileReader: globalThis.FileReader };
const originalBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");
const originalUrl = URL.createObjectURL(new Blob([originalBytes], { type: "image/png" }));
try {
  globalThis.window = { Image: class { naturalWidth = 1; naturalHeight = 1; async decode() {} } };
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob([new Uint8Array(1000)], { type: "image/webp" })) }) };
  globalThis.FileReader = class { readAsDataURL(blob) { void blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`; this.onload(); }); } };
  const output = await preparePhoto(originalUrl, 0.65);
  assert.equal(output.size, originalBytes.length);
  assert.equal(output.source, `data:image/png;base64,${originalBytes.toString("base64")}`, "A small original must keep its bytes while returning an encoded raster source, never the input URL");
} finally { Object.assign(globalThis, browser); URL.revokeObjectURL(originalUrl); }
for (const [width, height] of [[4000, 2240], [2240, 4000], [1200, 800], [1, 1]]) {
  const output = photoOutputSize(width, height);
  assert.ok(output.width > 0 && output.height > 0 && Math.max(output.width, output.height) <= 2400);
  assert.ok(output.width <= width && output.height <= height);
  assert.ok(Math.abs(output.width / output.height - width / height) < 0.01);
}
assert.deepEqual(photoOutputSize(4000, 2240), { width: 2400, height: 1344 });
assert.equal(photoSizeLabel(1024), "1KB");
assert.equal(photoSizeLabel(1024 * 1024), "1.00MB");
console.log("Photo optimization preserves proportions, bounds dimensions and formats actual sizes.");

const editedPhoto = { rotation: 90, sourceWidth: 4000, sourceHeight: 3000, crop: { x: 0.1, y: 0.1, width: 0.7933333333333333, height: 0.355 }, quality: 0.85 };
const editedFamily = { ...draft.families[0], photo_id: photoId, photo_edit: editedPhoto };
const editedDraft = weeklyDraftSchema.parse({ ...draft, families: [editedFamily], sermon: { ...draft.sermon, thumbnailId: photoId, thumbnailEdit: { ...editedPhoto, sourceWidth: 1600, sourceHeight: 900, rotation: 0, crop: { x: 0, y: 0, width: 1, height: 1 }, quality: 0.65 } } });
assert.equal(editedDraft.families[0].photo_edit.quality, 0.85, "Family output quality must survive saving");
assert.equal(editedDraft.sermon.thumbnailEdit.quality, 0.65, "Sermon photo editing must use the same stored settings");
assert.equal(weeklyValuesForSave(editedDraft).families[0].photo_id, photoId, "Editing must retain the original file reference");
assert.equal(weeklyDraftSchema.safeParse({ ...editedDraft, families: [{ ...editedFamily, photo_edit: { ...editedPhoto, quality: 0.1 } }] }).success, false);
assert.equal(weeklyDraftSchema.safeParse({ ...editedDraft, sermon: { ...editedDraft.sermon, thumbnailEdit: editedPhoto } }).success, false, "Sermon editing must validate its own fixed aspect ratio");
console.log("Photo edits preserve original references and output quality with domain-specific aspect ratios.");
const { photoCropForAspect } = await import("../src/features/files/utils/photo-crop-geometry.ts");
const legacyPhotoEdit = editedDraft.families[0].photo_edit;
const fittedCrop = photoCropForAspect(legacyPhotoEdit.sourceWidth, legacyPhotoEdit.sourceHeight, legacyPhotoEdit.rotation, legacyPhotoEdit.crop, 16 / 9);
const currentPhotoEdit = { ...legacyPhotoEdit, crop: fittedCrop };
assert.equal(weeklyDraftSchema.safeParse({ ...draft, families: [{ ...editedFamily, photo_edit: currentPhotoEdit }] }).success, true);
assert.ok(fittedCrop.x >= legacyPhotoEdit.crop.x && fittedCrop.y >= legacyPhotoEdit.crop.y);
assert.ok(fittedCrop.x + fittedCrop.width <= legacyPhotoEdit.crop.x + legacyPhotoEdit.crop.width + 0.00001);
assert.ok(fittedCrop.y + fittedCrop.height <= legacyPhotoEdit.crop.y + legacyPhotoEdit.crop.height + 0.00001);
assert.ok(Math.abs(fittedCrop.width * legacyPhotoEdit.sourceHeight / (fittedCrop.height * legacyPhotoEdit.sourceWidth) - 16 / 9) < 0.00001);
console.log("Legacy family crops remain readable and fit the final photo frame without losing original files.");
