import assert from "node:assert/strict";

export async function verifyWeeklyFollowup(page, origin) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Use a local app only");
  await page.goto(`${origin}/weekly?step=1`);
  await page.waitForSelector('.weekly-content input[name="date"]', { state: "attached" });
  const dates = await page.evaluate(() => [...document.querySelectorAll('input[name="date"]')].map(input => input.value));
  const now = await page.evaluate(() => Date.now());
  const korea = new Date(now + 9 * 60 * 60 * 1000);
  const sunday = new Date(Date.UTC(korea.getUTCFullYear(), korea.getUTCMonth(), korea.getUTCDate()));
  sunday.setUTCDate(sunday.getUTCDate() + (7 - sunday.getUTCDay()) % 7);
  assert.equal(dates.length, 5, "New publication options must contain exactly five Sundays");
  assert.equal(dates[1], sunday.toISOString().slice(0, 10), "The second option must be the current Korean Sunday");
  assert.deepEqual(dates.map(value => new Date(value).getTime()), Array.from({ length: 5 }, (_, index) => sunday.getTime() + (index - 1) * 7 * 86400000));

  const key = "hummunication.weekly-draft";
  const keys = [key, ...[...dates, "2035-01-07"].flatMap(date => [`hummunication.weekly-draft.${date}`, `hummunication.weekly.pending.${date}`])];
  const backup = await page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), keys);
  const fixture = {
    date: "2035-01-07", sections: ["family", "senders"], sermonThumbnail: "",
    sermon: { date: "2035-01-07", speaker: "", title: "", bible: "", content: { type: "doc", content: [{ type: "paragraph" }] } },
    families: [0, 1].map(index => ({ id: null, name: `예시 ${index + 1}순`, photo: "", photo_id: null, photo_edit: null, leader_name: "예시 순장", leader_answer: "공동체를 위해 기도해 주세요.", members: Array.from({ length: 10 }, (_, member) => ({ name: `예시 순원 ${member + 1}`, answer: "함께 기도하겠습니다." })) })),
    senders: [{ id: null, name: "예시 파송자", generation: "40", group_name: "예시 순", date: "2035-01-07", prayer: "새로운 이웃을 위해 기도해 주세요." }],
  };
  try {
    await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key, fixture });
    await page.goto(`${origin}/weekly?step=3`);
    await page.waitForSelector('[data-artifact-id="family-cover"]', { state: "visible" });
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-artifact-id] .family-cover-card').length), 1, "All groups must share one exported family cover");
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-artifact-id="family-1-2"], [data-artifact-id="family-2-2"]').length), 2, "Each group must retain its own thumbnail");

    await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await page.goto(`${origin}/weekly?step=2&view=family-card-edit&group=0`);
    await page.waitForSelector('.weekly-editor-layout .weekly-preview-panel', { state: "visible" });
    await page.evaluate(() => document.querySelector('.weekly-main').scrollTo({ top: 1100, behavior: "instant" }));
    assert.ok(await page.evaluate(() => document.querySelector('.weekly-editor-layout .weekly-preview-panel').getBoundingClientRect().top >= 0), "Desktop preview must stay visible while editing a long group");

    await page.cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await page.evaluate(() => document.querySelector('.weekly-main').scrollTo({ top: 1300, behavior: "instant" }));
    await page.waitForFunction(() => {
      const rect = document.querySelector('.weekly-editor-layout .weekly-preview-panel').getBoundingClientRect();
      return rect.top >= 0 && rect.bottom < innerHeight / 2;
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Mobile preview must not cause horizontal scrolling");
    await page.click('button[aria-label="새가족 카드 크게 보기"]');
    await page.waitForSelector('[role="dialog"] .family-card', { state: "visible" });
    assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"] .family-card').getBoundingClientRect().width > 200), "The small mobile preview must open at a readable size");
    await page.keyboard.press("Escape");

    await page.goto(`${origin}/weekly?step=2&view=sender-edit&group=0`);
    await page.waitForSelector('#sender-group_name', { state: "visible" });
    for (const id of ["sender-group_name", "sender-date"]) {
      assert.ok(await page.evaluate(id => {
        const input = document.getElementById(id);
        const description = document.getElementById(input.getAttribute("aria-describedby"));
        return description?.textContent.includes("관리용") && description.textContent.includes("카드에는 표시되지");
      }, id), `${id} must explain that it is saved as management information`);
    }
    await page.goto(`${origin}/weekly?step=1`);
    await page.waitForSelector(`input[name="date"][value="${dates[1]}"]`, { state: "attached" });
    assert.equal(await page.evaluate(() => document.querySelectorAll('input[name="date"]').length), 5, "An old draft must not add an extra publication date");
    assert.ok(await page.evaluate(date => document.querySelector(`input[name="date"][value="${date}"]`).checked, dates[1]), "An out-of-range draft must default to the current Sunday");
    await page.goto(`${origin}/weekly?step=2&view=family-card-edit&group=0`);
    await page.waitForSelector('#family-name');
    assert.equal(await page.evaluate(() => document.querySelector('#family-name').value), "예시 1순", "Adjusting an old draft date must preserve its content");
    console.log("PASS: upcoming Sundays, one family cover, desktop/mobile sticky previews and management-field descriptions");
  } finally {
    await page.goto(`${origin}/home`);
    await page.evaluate(backup => { for (const [key, value] of backup) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } }, backup);
    await page.cdp("Emulation.clearDeviceMetricsOverride");
  }
}
