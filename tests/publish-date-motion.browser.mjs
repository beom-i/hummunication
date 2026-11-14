import assert from "node:assert/strict";

export async function verifyPublishDateMotion(page) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(await page.url()).hostname), "Run against the local app");
  await page.waitForSelector(".publish-date-card");
  const layout = () => page.evaluate(() => [...document.querySelectorAll(".publish-date-card")].map(card => ({ top: card.getBoundingClientRect().top, height: card.offsetHeight })));
  const before = await layout();
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.publish-date-card')].some(card => card.getAnimations().some(a => a.id === 'publish-date-bounce'))), false, "Initial selection must not bounce");
  const point = await page.evaluate(() => {
    const card = document.querySelector(".publish-date-card"), rect = card.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, value: card.htmlFor };
  });
  await page.mouse.move(0, 0);
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".publish-date-card")).scale === "0.985");
  await page.mouse.down();
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".publish-date-card")).scale === "0.965");
  await page.mouse.up();
  const frames = await page.evaluate(() => {
    const card = document.querySelector(".publish-date-card"), animation = card.getAnimations().find(a => a.id === "publish-date-bounce");
    if (!animation) return null;
    animation.pause();
    const scales = [0, 286, 416, 519].map(time => { animation.currentTime = time; return Number(getComputedStyle(card).scale); });
    animation.finish();
    return scales;
  });
  assert.deepEqual(frames?.slice(0, 3), [.965, 1.024, .996]);
  assert.ok(Math.abs(frames[3] - 1) < .0001);
  await page.waitForFunction(() => document.querySelector(".publish-date-card").getAnimations().every(a => a.playState === "finished"));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".publish-date-card")).scale), "1");
  assert.equal(await page.evaluate(() => document.querySelector('input[name="date"]:checked').value), point.value, "Animation must preserve the real form selection");
  assert.deepEqual(await layout(), before, "Selecting a date must not shift other cards");
  await page.mouse.click(point.x, point.y);
  assert.equal(await page.evaluate(() => document.querySelector(".publish-date-card").getAnimations().some(a => a.id === "publish-date-bounce")), true, "Clicking the selected date must replay the bounce");
  await page.waitForFunction(() => document.querySelector(".publish-date-card").getAnimations().every(a => a.playState === "finished"));
  try {
    await page.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await page.mouse.click(point.x, point.y);
    assert.equal(await page.evaluate(() => document.querySelector(".publish-date-card").getAnimations().some(a => a.id === "publish-date-bounce")), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".publish-date-card")).scale), "1");
  } finally {
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
  }
  return { hover: .985, press: .965, bounce: frames, stableLayout: true, repeatClick: true, reducedMotion: true };
}
