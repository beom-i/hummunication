import assert from "node:assert/strict";
import { initialWeeklyValues } from "../src/features/weekly/utils/initial-values.ts";
import { weeklyErrorMessages } from "../src/features/weekly/utils/form-feedback.ts";
import { paginateSermon } from "../src/features/weekly/utils/sermon-pagination.ts";
const html = paginateSermon({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "고정 서식", marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "#B92330", fontSize: "32px" } }] }] }] }, { innerHTML: "", getBoundingClientRect: () => ({ height: 0 }) }).join("");
assert.equal(html.includes("style="), false, "Template output must ignore legacy color and size");
assert.ok(html.includes("<strong>"));
const now = new Date("2026-11-14T03:00:00Z");
const previous = initialWeeklyValues(undefined, new Date("2026-11-07T03:00:00Z"));
previous.sermon.title = "복구할 제목";
const restored = initialWeeklyValues(previous, now);
assert.equal(restored.date, "2026-11-15");
assert.equal(restored.sermon.date, "2026-11-15");
assert.equal(restored.sermon.title, "복구할 제목");
previous.sermon.date = "2026-11-13";
assert.equal(initialWeeklyValues(previous, now).sermon.date, "2026-11-13", "A separately chosen sermon date must survive draft recovery");
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
console.log("PASS: new drafts default to the next Korean Sunday and all nested field errors share one labelled summary");
