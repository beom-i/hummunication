import assert from "node:assert/strict";

export async function verifyRecentBulletinPreview(page) {
  const records = [
    { date: "2026-11-08", title: "11월 둘째주 주보" },
    { date: "2026-10-25", title: "10월 넷째주 주보" },
  ];
  const results = [];
  for (const { date, title } of records) {
    const selector = `[data-bulletin-id="${date}"]`;
    await page.waitForSelector(selector);
    await page.hover("h1");
    await page.waitForFunction(() => [...document.querySelectorAll(".bulletin-reveal")].every(reveal => reveal.getAnimations({ subtree: true }).every(animation => animation.playState === "finished")));
    await page.hover(selector);
    await page.waitForFunction(selector => document.querySelector(selector)?.querySelector(".bulletin-reveal")?.getAnimations({ subtree: true }).every(animation => animation.playState === "finished"), selector);
    const result = await page.evaluate(selector => {
      const card = document.querySelector(selector);
      const reveal = card.querySelector(".bulletin-reveal").getBoundingClientRect();
      const photo = card.querySelector(".bulletin-photo").getBoundingClientRect();
      const sheet = card.querySelector("[data-export-html]");
      const church = sheet?.querySelector(".bulletin-church");
      const churchBox = church?.getBoundingClientRect();
      return {
        date: card.dataset.bulletinId, viewport: innerWidth,
        title: sheet?.querySelector(".bulletin-date")?.textContent ?? "",
        staticMock: !!card.querySelector('img[src*="bulletin-preview.png"]'),
        churchVisible: !!churchBox && churchBox.top >= reveal.top && churchBox.bottom <= reveal.bottom + 1,
        photoVisible: photo.top >= reveal.top && photo.bottom <= reveal.bottom + 1,
        width: photo.width, height: photo.height, expandedHeight: reveal.height,
        cardHeight: card.getBoundingClientRect().height,
      };
    }, selector);
    assert.equal(result.staticMock, false, "Saved bulletins must not all show the same dated mock PNG");
    assert.equal(result.title, title, "The home image and card title must use the same saved publication date");
    assert.ok(result.churchVisible, "Expanding the card must expose both church-name lines without cropping");
    assert.ok(result.photoVisible, "The complete thumbnail must fit within the expanded card");
    assert.ok(result.cardHeight >= result.expandedHeight - 1, "Expanded cards must reserve their height so they cannot cover the next bulletin");
    assert.ok(Math.abs(result.height - ((result.width - 6) * 514 / 720 + 6)) < 2, "The complete exported 720×514 image must keep its aspect ratio at every card width");
    results.push(result);
  }
  return results;
}
