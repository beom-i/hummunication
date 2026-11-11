#!/bin/sh
# Usage: scripts/check-bulletin-save.sh <ego task-space id>, with localhost open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const page = (await taskSpace($1)).page("p1");
const origin = new URL(await page.url()).origin;
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Run against a local preview");
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const savedKey = "hummunication.weekly.saved", legacyKey = "hummunication.weekly-draft";
const backup = await page.evaluate(({savedKey, legacyKey}) => ({ saved: localStorage.getItem(savedKey), legacy: localStorage.getItem(legacyKey), edits: Object.fromEntries(Object.keys(sessionStorage).filter(k => k.startsWith("hummunication.weekly.edit.")).map(k => [k, sessionStorage.getItem(k)])) }), {savedKey, legacyKey});
try {
  await page.evaluate(({savedKey, legacyKey}) => { localStorage.removeItem(savedKey); localStorage.removeItem(legacyKey); }, {savedKey, legacyKey});
  await page.goto(origin + "/bulletins?date=2026-11-01");
  await page.waitForSelector('button:text-is("수정")');
  assert(await page.evaluate(() => !document.querySelector('[contenteditable="true"],input:not([type="hidden"])')), "Detail is editable");
  await page.click('button:text-is("수정")');
  await page.fill("#bulletin-password", "000000");
  await page.click('button:text-is("수정 모드로 열기")');
  await page.waitForSelector('text="편집 비밀번호가 맞지 않아요. 날짜를 다시 확인해 주세요"');
  await page.fill("#bulletin-password", "2026-11-01".slice(2).replaceAll("-", ""));
  await page.click('button:text-is("수정 모드로 열기")');
  await page.waitForSelector('h1:text-is("어떤 구성으로 만들까요?")');
  await page.click('button:text-is("다음")');
  await page.waitForSelector("#sermon-title");
  await page.fill("#sermon-title", "저장 확인용 설교");
  await page.click('button:text-is("저장")');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("hummunication.weekly.saved") || "[]")[0]?.data.sermon.title === "저장 확인용 설교");
  await page.reload();
  await page.waitForSelector("#sermon-title");
  assert(await page.evaluate(() => document.querySelector("#sermon-title").value === "저장 확인용 설교"), "Saved edit did not restore");
  await page.click('button:text-is("다음")');
  await page.waitForSelector("#sermon-content");
  await page.press("#sermon-content", "ControlOrMeta+A");
  await page.keyboard.insertText("서식 보존 문장");
  await page.press("#sermon-content", "ControlOrMeta+A");
  await page.click('button[aria-label="굵게"]');
  await page.click('button:text-is("다음")');
  await page.waitForSelector('section[aria-label="새가족 순 목록"]');
  await page.click('button:text-is("다음")');
  await page.waitForSelector('h1:text-is("새가족 문답 미리보기")');
  await page.click('button:text-is("다음")');
  await page.waitForSelector('[data-artifact-id="sermon-2"]');
  await page.click('button:text-is("저장")');
  await page.waitForSelector('button:text-is("수정")');
  await page.waitForFunction(() => document.querySelector(".sermon-sheet-body strong")?.textContent === "서식 보존 문장");
  assert(new URL(await page.url()).pathname === "/bulletins", "Final save did not open detail");
  await page.goto(origin + "/weekly?bulletin=2026-11-01&step=2");
  await page.waitForSelector('button:text-is("수정")');
  assert(new URL(await page.url()).pathname === "/bulletins", "Direct editor URL bypassed the code gate");
  console.log("PASS: wrong/right date code, edit/reload, rich text save, detail return, direct URL gate");

  await page.goto(origin + "/weekly?step=1");
  await page.waitForSelector('input[value="2026-11-08"]');
  await page.click('button:text-is("저장")');
  await page.waitForFunction(() => new URL(location.href).searchParams.get("bulletin") === "2026-11-08");
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem("hummunication.weekly.saved")).length === 2), "New save overwrote the old bulletin");
  await page.click('button[aria-label="홈"]');
  await page.waitForSelector('a[aria-label="11월 둘째주 주보 상세 보기"]');
  assert(await page.evaluate(() => !sessionStorage.getItem("hummunication.weekly.edit.2026-11-08")), "Leaving editor retained edit permission");
  await page.goto(origin + "/weekly?step=1");
  await page.waitForSelector('input[value="2026-11-08"]');
  await page.click('button:text-is("저장")');
  await page.waitForSelector('[role="alert"]:text-is("해당 날짜의 주보가 있어요. 주보 상세에서 수정해 주세요")');
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem("hummunication.weekly.saved")).length === 2), "Duplicate save altered existing records");

  await page.evaluate(() => {
    const data = structuredClone(JSON.parse(localStorage.getItem("hummunication.weekly.saved"))[0].data);
    data.date = "2026-11-22"; data.sermon.title = "이전 저장본 복원";
    localStorage.setItem("hummunication.weekly-draft", JSON.stringify(data));
  });
  await page.goto(origin + "/weekly?step=2&view=sermon");
  await page.waitForSelector("#sermon-title");
  assert(await page.evaluate(() => document.querySelector("#sermon-title").value === "이전 저장본 복원"), "Legacy data did not restore");
  const beforeFailure = await page.evaluate(() => localStorage.getItem("hummunication.weekly.saved"));
  await page.evaluate(() => {
    window.__originalBulletinSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === "hummunication.weekly.saved") throw new DOMException("Test quota", "QuotaExceededError"); return window.__originalBulletinSetItem.call(this, key, value); };
  });
  await page.click('button:text-is("저장")');
  await page.waitForSelector('[role="alert"]:text-is("저장 공간이 부족해요. 사진 크기를 줄이거나 브라우저 저장 공간을 확인해 주세요")');
  assert(await page.evaluate(() => localStorage.getItem("hummunication.weekly.saved")) === beforeFailure, "Failed save damaged previous records");
  assert(await page.evaluate(() => !!localStorage.getItem("hummunication.weekly-draft") && document.querySelector("#sermon-title").value === "이전 저장본 복원"), "Failed save lost working/legacy content");
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalBulletinSetItem; delete window.__originalBulletinSetItem; });
  await page.click('button:text-is("저장")');
  await page.waitForFunction(() => !localStorage.getItem("hummunication.weekly-draft") && JSON.parse(localStorage.getItem("hummunication.weekly.saved")).length === 3);
  console.log("PASS: independent records, recent home entry, duplicate prevention, legacy migration, quota failure preserves data");
} finally {
  await page.goto(origin + "/home");
  await page.waitForSelector('a[aria-label$="주보 상세 보기"]');
  await page.evaluate(({savedKey, legacyKey, backup}) => {
    if (window.__originalBulletinSetItem) { Storage.prototype.setItem = window.__originalBulletinSetItem; delete window.__originalBulletinSetItem; }
    for (const [key, value] of [[savedKey, backup.saved], [legacyKey, backup.legacy]]) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("hummunication.weekly.edit.")) sessionStorage.removeItem(key);
    for (const [key, value] of Object.entries(backup.edits)) sessionStorage.setItem(key, value);
  }, {savedKey, legacyKey, backup});
}
JS
