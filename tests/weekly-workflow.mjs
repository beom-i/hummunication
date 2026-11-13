import assert from "node:assert/strict";
import "./publish-dates.mjs";
import { weeklyLocation, weeklyHref, weeklyIndicatorStep, weeklyHeading, firstContentView, boundedEntryIndex } from "../src/features/weekly/utils/workflow.ts";
import { sidebarOffset } from "../src/features/workspace/utils/sidebar-offset.ts";

assert.deepEqual(weeklyLocation(new URLSearchParams()), { step: 1, view: "options" });
assert.deepEqual(weeklyLocation(new URLSearchParams("step=2-1")), { step: 2, view: "sermon" }, "Legacy sermon URLs must remain readable");
assert.deepEqual(weeklyLocation(new URLSearchParams("step=2&view=unknown")), { step: 2, view: "options" });
const views = ["options", "sermon", "sermon-preview", "families", "family-card-edit", "senders", "sender-edit"];
for (const view of views) {
  const url = new URL(weeklyHref(2, view, "2035-01-07", 1, 2), "https://example.com");
  assert.deepEqual(weeklyLocation(url.searchParams), { step: 2, view });
  assert.equal(url.searchParams.get("bulletin"), "2035-01-07");
  assert.equal(url.searchParams.get("group"), "1");
  assert.equal(url.searchParams.get("card"), "2");
  assert.equal(weeklyIndicatorStep(2, view), view === "options" ? 1 : 2);
  assert.equal(weeklyIndicatorStep(3, view), 3);
  assert.ok(weeklyHeading(2, view, false).title);
}
assert.equal(weeklyHref(1), "/weekly?step=1");
assert.equal(weeklyHeading(1, "options", true).description, "저장된 주보의 발행일이에요");
assert.equal(weeklyHeading(1, "options", false).description, "발행일(주일) 기준으로 주차가 자동 계산돼요");
assert.equal(weeklyHeading(2, "family-card-edit", false).title, "새가족 문답 내용을\n입력해 주세요");
assert.deepEqual(weeklyLocation(new URLSearchParams("step=2&view=family-edit&group=1")), { step: 2, view: "family-card-edit" });
assert.deepEqual(weeklyLocation(new URLSearchParams("step=2&view=family-preview")), { step: 2, view: "families" });
assert.equal(weeklyHeading(3, "options", false).title, "결과물 확인 및 추출");

// The content step must never open an editor for an unselected section.
const sections = ["thumbnail", "cover", "sermon", "family", "senders"];
for (let mask = 0; mask < 32; mask++) {
  const selected = sections.filter((_, index) => mask & (1 << index));
  const view = firstContentView(selected);
  const sectionForView = { sermon: "sermon", families: "family", senders: "senders" };
  if (view === "options") assert.ok(!selected.some(value => ["sermon", "family", "senders"].includes(value)));
  else assert.ok(selected.includes(sectionForView[view]), `${selected}: opened unselected ${view}`);
}
assert.equal(firstContentView(["family", "sermon", "senders"]), "sermon");
for (const value of [null, "-1", "1.5", "invalid", "99"]) assert.equal(boundedEntryIndex(value, 2), 0);
assert.equal(boundedEntryIndex("1", 2), 1);
assert.equal(boundedEntryIndex("0", 0), 0);
assert.equal(sidebarOffset(true, "expanded"), "0px");
assert.equal(sidebarOffset(false, "collapsed"), "var(--sidebar-width-icon)");
assert.equal(sidebarOffset(false, "expanded"), "var(--sidebar-width)");
console.log("PASS: weekly URLs, headings, section selection and sidebar offsets share the same rules");
