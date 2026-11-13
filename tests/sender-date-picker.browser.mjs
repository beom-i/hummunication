import assert from "node:assert/strict";

export async function verifySenderDatePicker(page, origin) {
  await page.goto(`${origin}/weekly?step=2&view=sender-edit&group=0`);
  await page.waitForSelector("#sender-date", { state: "visible" });
  assert.equal(await page.evaluate(() => document.querySelector("#sender-date").tagName), "BUTTON", "Sender dates must use the shared DatePicker, not the browser's native date input");
  await page.click("#sender-date");
  await page.waitForSelector('[data-slot="popover-content"] [data-day]', { state: "visible" });
  const day = await page.evaluate(() => [...document.querySelectorAll('[data-slot="popover-content"] button[data-day]')].find(button => button.textContent.trim() === "20").dataset.day);
  const [year, month, date] = day.match(/\d+/g);
  const expected = `${year}-${month.padStart(2, "0")}-${date.padStart(2, "0")}`;
  assert.ok(await page.evaluate(() => {
    const field = document.querySelector("#sender-date").getBoundingClientRect();
    const calendar = document.querySelector('[data-slot="popover-content"]').getBoundingClientRect();
    return Math.abs(field.width - calendar.width) < 2;
  }), "The calendar must match the date field width");
  await page.click(`[data-slot="popover-content"] button[data-day="${day}"]`);
  await page.waitForFunction(value => JSON.parse(localStorage.getItem("hummunication.weekly-draft") ?? "null")?.senders?.[0]?.date === value, expected);
  assert.equal(await page.evaluate(() => document.querySelector("#sender-date").textContent.trim()), `${year}. ${month.padStart(2, "0")}. ${date.padStart(2, "0")}.`);
  await page.reload();
  await page.waitForFunction(value => document.querySelector("#sender-date")?.textContent.includes(value), `${year}. ${month.padStart(2, "0")}. ${date.padStart(2, "0")}.`);
  await page.click("#sender-date");
  await page.click('loc=role:button[name="날짜 지우기"]');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("hummunication.weekly-draft") ?? "null")?.senders?.[0]?.date === "");
  assert.equal(await page.evaluate(() => document.querySelector("#sender-date").textContent.trim()), "날짜를 선택해 주세요");
  console.log("PASS: shared sender calendar, matching width, ISO date binding, reload recovery and clearing an optional date");
}
