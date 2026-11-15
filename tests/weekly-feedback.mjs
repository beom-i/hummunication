import assert from "node:assert/strict";
import { initialWeeklyValues } from "../src/features/weekly/utils/initial-values.ts";
import { weeklyErrorMessages } from "../src/features/weekly/utils/form-feedback.ts";
import { paginateSermon } from "../src/features/weekly/utils/sermon-pagination.ts";
const html = paginateSermon({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "고정 서식", marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "#B92330", fontSize: "32px" } }] }] }] }, { innerHTML: "", getBoundingClientRect: () => ({ height: 0 }) }).join("");
assert.equal(html.includes("style="), false, "Template output must ignore legacy color and size");
assert.ok(html.includes("<strong>"));
const now = new Date("2026-11-14T03:00:00Z");
const fresh = initialWeeklyValues(now);
assert.equal(fresh.date, "2026-11-15");
assert.equal(fresh.sermon.date, "2026-11-15");
assert.equal(fresh.sermon.title, "");
fresh.sermon.title = "저장하지 않은 제목";
assert.equal(initialWeeklyValues(now).sermon.title, "", "New work must not restore unsaved content");
assert.deepEqual(weeklyErrorMessages({}), []);
const errors = {
  root: { type: "INVALID_INPUT", message: "입력 내용을 확인해 주세요" },
  sermon: { speaker: { message: "설교자를 입력해 주세요" } },
  families: [{ members: [{ name: { message: "이름을 입력해 주세요", ref: { self: null } } }] }],
  senders: [{ generation: { message: "기수를 숫자로 입력해 주세요" } }],
};
const messages = weeklyErrorMessages(errors);
assert.deepEqual(messages.map(item => item.label), ["설교자", "새가족 1 · 순원 1 이름", "파송자 1 · 기수"]);
assert.equal(messages.some(item => item.path === "root"), false, "Generic root validation text must not repeat the detailed field errors");
assert.deepEqual(weeklyErrorMessages({ root: { type: "CONFLICT", message: "같은 날짜의 주보가 있어요" } }).map(item => item.message), ["같은 날짜의 주보가 있어요"]);
const queuedErrors = { sermon: {
  speaker: { message: "설교자를 입력해 주세요" }, title: { message: "설교 제목을 입력해 주세요" },
  bible: { message: "성경 본문을 입력해 주세요" }, content: { message: "정리 내용을 입력해 주세요" },
}, families: [{ name: { message: "순 이름을 입력해 주세요" } }] };
assert.deepEqual(weeklyErrorMessages(queuedErrors).map(item => item.path), ["sermon.speaker", "sermon.title", "sermon.bible"]);
delete queuedErrors.sermon.speaker;
assert.deepEqual(weeklyErrorMessages(queuedErrors).map(item => item.path), ["sermon.title", "sermon.bible", "sermon.content"], "Resolving an error must reveal the next error without discarding hidden errors");
delete queuedErrors.sermon.title;
assert.deepEqual(weeklyErrorMessages(queuedErrors).map(item => item.path), ["sermon.bible", "sermon.content", "families.0.name"]);
console.log("PASS: new drafts default to the next Korean Sunday and all nested field errors share one labelled summary");
