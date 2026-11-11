#!/bin/sh
# Usage: scripts/check-weekly-interactions.sh <ego task-space id>, with the mockup open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const page = (await taskSpace($1)).page("p1");
const origin = new URL(await page.url()).origin;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
await page.cdp("Emulation.setDeviceMetricsOverride", {width:1440,height:1024,deviceScaleFactor:1,mobile:false});
await page.goto(origin + "/weekly?step=2&view=sermon");
await page.waitForSelector("#sermon-date");
assert(await page.evaluate(() => {
  const center = e => { const r=e.getBoundingClientRect(); return r.x+r.width/2; };
  return Math.abs(center(document.querySelector("h1"))-center(document.querySelector(".weekly-sermon-layout")))<1;
}), "Sermon heading and preview are not centered together");
await page.click("#sermon-date");
await page.waitForFunction(() => Math.abs(document.querySelector('#sermon-date').getBoundingClientRect().width-document.querySelector('[data-slot="popover-content"]').getBoundingClientRect().width)<1);
await page.click('button[aria-label^="2026년 11월 22일"]');
assert(await page.evaluate(() => document.querySelector("#sermon-date").textContent.includes("2026. 11. 22.")), "Calendar selection did not update the field");
assert(await page.evaluate(() => document.querySelector(".news-card svg").textContent.includes("2026.11.22")), "Calendar selection did not update the preview");
await page.evaluate(() => performance.clearResourceTimings());
await page.click('loc=role:button[name="다음"]');
await page.waitForSelector("#sermon-content");
assert(await page.evaluate(() => !document.querySelector("#sermon-date")), "Cover fields leaked into the body editor");
await page.press("#sermon-content", "ControlOrMeta+ArrowDown");
for(let i=0;i<24;i++) await page.press("#sermon-content", "Enter");
await page.keyboard.insertText("Enter 뒤의 마지막 문장");
await page.waitForFunction(() => document.querySelector('section[aria-label="설교 본문 카드뉴스 미리보기"]').getAttribute("aria-busy")==="false");
assert(await page.evaluate(() => {
  const cards=[...document.querySelectorAll('[role="tabpanel"] .sermon-sheet-body')];
  return cards.length>1 && cards.map(c=>c.textContent).join("")===document.querySelector("#sermon-content").textContent && cards.every(c=>c.scrollHeight<=c.clientHeight+1);
}), "Automatic pages lost or clipped body text");
const fontBefore=await page.evaluate(()=>getComputedStyle(document.querySelector('.sermon-sheet')).fontFamily);
await page.click('button[aria-label="설교 본문 1페이지 크게 보기"]');
await page.waitForSelector('[role="dialog"] .sermon-sheet');
assert(await page.evaluate(()=>getComputedStyle(document.querySelector('[role="dialog"] .sermon-sheet')).fontFamily)===fontBefore,"Enlarged preview changed the font");
await page.keyboard.press("Escape");
await page.click('loc=role:button[name="다음"]');
await page.waitForSelector('section[aria-label="새가족 순 목록"]');
const groupCount=await page.evaluate(() => document.querySelectorAll('section[aria-label="새가족 순 목록"] article').length);
const mainCenter=await page.evaluate(()=>{const r=document.querySelector('.weekly-main').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await page.mouse.move(mainCenter.x,mainCenter.y);
await page.mouse.wheel(0,600);
await page.click('loc=role:button[name="순 추가하기"]');
await page.waitForSelector("#family-name");
assert(await page.evaluate(() => !performance.getEntriesByType("resource").some(r => r.name.includes("_rsc"))), "Local steps requested the server");
assert(await page.evaluate(() => document.querySelector("#family-name").value) === String(groupCount+1)+" 순", "New group was lost during navigation");
await page.click('loc=role:button[name="순원 추가하기"]');
await page.waitForSelector('textarea[aria-label="순원 2 답변"]');
assert(await page.evaluate(() => getComputedStyle(document.querySelector('textarea[aria-label="순원 2 답변"]').parentElement).animationName === "weekly-enter"), "New member has no entrance motion");
await page.click('loc=role:button[name="다음"]');
await page.waitForSelector('section[aria-label="새가족 순 목록"]');
await page.click('loc=role:button[name="다음"]');
await page.waitForFunction(() => document.querySelector("main h1").textContent === "새가족 문답 미리보기");
await page.click('loc=role:button[name="다음"]');
await page.waitForSelector('[data-artifact-id="bulletin-thumbnail"]');
await page.evaluate(() => { window.__cardSvg=document.querySelector('[data-artifact-id="bulletin-thumbnail"] .news-card svg'); });
await page.click('label[for="select-bulletin-thumbnail"]');
assert(await page.evaluate(() => document.querySelector("#select-bulletin-thumbnail").getAttribute("aria-checked") === "false"), "Card click did not deselect");
await page.click('label[for="select-bulletin-thumbnail"]');
assert(await page.evaluate(() => document.querySelector("#select-bulletin-thumbnail").getAttribute("aria-checked") === "true"), "Card click did not select");
assert(await page.evaluate(() => window.__cardSvg===document.querySelector('[data-artifact-id="bulletin-thumbnail"] .news-card svg')), "Selection remounted the preview");
const centerBefore=await page.evaluate(() => {const r=document.querySelector(".weekly-download-bar").getBoundingClientRect();return r.x+r.width/2;});
await page.click('button[aria-label="파일 형식"]');
await page.waitForSelector('[data-slot="select-content"]');
const centerOpen=await page.evaluate(() => {const r=document.querySelector(".weekly-download-bar").getBoundingClientRect();return r.x+r.width/2;});
assert(Math.abs(centerBefore-centerOpen)<1, "Select moved the download bar");
await page.click('text="JPG"');
await page.waitForSelector('[data-slot="select-content"]',{state:"hidden"});
assert(await page.evaluate(() => document.querySelector('button[aria-label="파일 형식"]').textContent.includes("JPG")), "shadcn Select did not update");
const fs=await import("node:fs/promises");
const os=await import("node:os");
const path=await import("node:path");
const {execFileSync}=await import("node:child_process");
const directory=await fs.mkdtemp(path.join(os.tmpdir(),"hummunication-interactions-"));
try {
  const downloadPromise=page.waitForEvent("download",{timeout:15000});
  await page.click('loc=role:button[name="내려받기"]');
  await page.waitForSelector('.weekly-download-bar button[aria-busy="true"]');
  assert(await page.evaluate(() => document.querySelector('.weekly-download-bar button[aria-busy="true"]').firstElementChild?.getAttribute("data-slot")==="spinner"), "Download has no leading spinner");
  const download=await downloadPromise;
  const file=path.join(directory,"weekly.zip");
  await download.saveAs(file);
  execFileSync("unzip",["-t",file],{stdio:"pipe"});
  await page.waitForFunction(() => !document.querySelector('.weekly-download-bar button[aria-busy="true"]'));
} finally { await fs.rm(directory,{recursive:true,force:true}); }
console.log("PASS: calendar width, live cover, rich editor, Enter pagination, enlarged preview, local navigation, adding members, selection, Select stability, leading spinner, ZIP export");
JS
