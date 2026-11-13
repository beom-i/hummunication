import assert from "node:assert/strict";

export async function verifyHomeLoading(page, origin, outcome = "empty") {
  const html = await (await fetch(new URL("/home", origin))).text();
  assert.equal((html.match(/data-bulletin-id="/g) ?? []).length, 0, "The first response must not render sample bulletin cards before loading");
  assert.ok(html.includes("최근 주보를 불러오는 중이에요"), "The first response must include the loading state");
  const { identifier } = await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    const originalFetch = window.fetch;
    const gate = new Promise(resolve => { window.__releaseHomeLoad = resolve; });
    window.fetch = (...args) => {
      if (new Headers(args[1]?.headers).has("Next-Action")) {
        window.__homeRequestStarted = true;
        return gate.then(() => {
          if (${outcome === "error"}) throw new TypeError("Simulated unavailable request");
          return originalFetch(...args);
        });
      }
      return originalFetch(...args);
    };
  ` });
  try {
    await page.goto(new URL("/home", origin).href);
    await page.waitForFunction(() => window.__homeRequestStarted === true);
    const loading = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="recent-heading"]');
      return { busy: section.getAttribute("aria-busy"), cards: section.querySelectorAll("[data-bulletin-id]").length, skeletons: section.querySelectorAll('[data-slot="skeleton"]').length, empty: section.textContent.includes("저장된 주보가 없어요"), disabled: section.querySelector("button").disabled };
    });
    assert.equal(loading.busy, "true");
    assert.equal(loading.cards, 0);
    assert.ok(loading.skeletons >= 4);
    assert.equal(loading.empty, false, "An unresolved request must not flash an empty state");
    assert.equal(loading.disabled, true);
    await page.evaluate(() => window.__releaseHomeLoad());
    await page.waitForFunction(() => document.querySelector('section[aria-labelledby="recent-heading"]')?.getAttribute("aria-busy") === "false");
    const ready = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="recent-heading"]');
      return { cards: section.querySelectorAll("[data-bulletin-id]").length, skeletons: section.querySelectorAll('[data-slot="skeleton"]').length, empty: section.textContent.includes("저장된 주보가 없어요"), error: !!section.querySelector('[role="alert"]') };
    });
    assert.deepEqual(ready, { cards: 0, skeletons: 0, empty: outcome === "empty", error: outcome === "error" });
    return { loading, ready };
  } finally {
    await page.evaluate(() => window.__releaseHomeLoad?.());
    await page.cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
}
