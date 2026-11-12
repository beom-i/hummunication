import assert from "node:assert/strict";
import { senderPrayerPages } from "../src/components/weekly/sender-pagination.ts";
import { weeklyDraftSchema, weeklySchema, weeklyDefaultValues } from "../src/components/weekly/schemas.ts";

const draft = weeklyDraftSchema.parse(weeklyDefaultValues);
assert.equal(weeklyDraftSchema.safeParse({ ...draft, sections: [] }).success, true);
assert.equal(weeklySchema.safeParse({ ...draft, sections: [] }).success, false);

const senderOnly = { ...draft, sections: ["senders"], senders: [{ name: "예시 파송자", generation: "40", group: "예시순", date: "2026-11-15", prayer: "공동체를 위한 기도" }] };
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
