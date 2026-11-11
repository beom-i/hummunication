#!/bin/sh
# Usage: scripts/check-weekly-layout.sh <ego task-space id>, with localhost open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const page = (await taskSpace($1)).page("p1");
const origin = new URL(await page.url()).origin;
const assert = (ok, message) => { if (!ok) throw new Error(message); };
await page.cdp("Emulation.setDeviceMetricsOverride", {width:1440,height:1024,screenWidth:1440,screenHeight:1024,deviceScaleFactor:1,mobile:false});
await page.goto(origin + "/weekly?step=1");
await page.waitForSelector('input[type="radio"]');
const firstFooter = await page.evaluate(() => {
  const footer = document.querySelector(".weekly-footer");
  return { ...footer.getBoundingClientRect().toJSON(), labels: [...footer.querySelectorAll("button")].map(button => button.textContent) };
});
assert(firstFooter.labels.join(",") === "이전,저장,다음", "Date step is missing shared actions");
assert(firstFooter.bottom === 1024 && firstFooter.height === 80, "Date footer is not fixed to the viewport bottom");
await page.click('button:text-is("다음")');
await page.waitForSelector('h1:text-is("어떤 구성으로 만들까요?")');
assert(await page.evaluate(first => {
  const rect = document.querySelector(".weekly-footer").getBoundingClientRect();
  return ["x", "y", "width", "height"].every(key => Math.abs(first[key] - rect[key]) < 1);
}, firstFooter), "Date/configuration footers have different positions");
await page.click('button:text-is("이전")');
await page.waitForSelector('input[type="radio"]');
await page.click('button:text-is("이전")');
await page.waitForSelector('a[aria-label$="주보 상세 보기"]');
assert(new URL(await page.url()).pathname === "/home", "First-step back action did not return home");

await page.goto(origin + "/weekly?step=2&view=sermon-preview");
await page.waitForSelector("#sermon-content");
await page.waitForFunction(() => document.querySelector('section[aria-label="설교 본문 카드뉴스 미리보기"]').getAttribute("aria-busy") === "false");
assert(await page.evaluate(() => {
  const editor = document.querySelector(".rich-editor").getBoundingClientRect();
  const preview = document.querySelector('section[aria-label="설교 본문 카드뉴스 미리보기"]').getBoundingClientRect();
  return Math.abs(editor.top - preview.top) < 1 && !document.body.textContent.includes("실시간 반영됨");
}), "Editor/preview top edges differ or the live status remains");
console.log("PASS: shared fixed footer, next/back navigation, aligned editor/preview, removed live status");

await page.cdp("Emulation.setDeviceMetricsOverride", {width:320,height:800,screenWidth:320,screenHeight:800,deviceScaleFactor:1,mobile:true});
await page.goto(origin + "/weekly?step=1");
await page.waitForSelector('input[type="radio"]');
await page.waitForFunction(() => innerWidth === 320 && document.querySelector(".weekly-footer").getBoundingClientRect().left === 0);
assert(await page.evaluate(() => {
  const footer = document.querySelector(".weekly-footer");
  return document.documentElement.scrollWidth <= 320 && footer.getBoundingClientRect().bottom === 800 && [...footer.querySelectorAll("button")].every(button => { const r = button.getBoundingClientRect(); return r.left >= 0 && r.right <= 320; });
}), "Mobile footer clips its actions or overflows the viewport");
await page.click('label[for="2026-11-29"]');
assert(await page.evaluate(() => document.querySelector('input[value="2026-11-29"]').checked && document.querySelector('label[for="2026-11-29"]').getBoundingClientRect().bottom <= document.querySelector(".weekly-footer").getBoundingClientRect().top), "Last date is hidden behind the footer");
await page.goto(origin + "/weekly?step=2&view=sermon-preview");
await page.waitForSelector("#sermon-content");
assert(await page.evaluate(() => {
  const editor = document.querySelector(".rich-editor").getBoundingClientRect();
  const preview = document.querySelector('section[aria-label="설교 본문 카드뉴스 미리보기"]').getBoundingClientRect();
  return preview.top >= editor.bottom && document.documentElement.clientWidth === 320 && document.documentElement.scrollWidth <= 320;
}), "Mobile preview does not stack cleanly below the editor");
console.log("PASS: 320px footer actions, unobscured date selection, stacked editor/preview");
JS
