import assert from "node:assert/strict";

export async function verifyWorkspaceStartup(page, origin) {
  const response = await page.fetch(new URL("/home", origin).href);
  assert.equal(response.status, 200);
  assert.equal(response.body.includes("로그인 상태를 확인하고 있어요"), false, "App startup must use HU/CU instead of the temporary auth spinner");
  const { identifier } = await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__startupSplashes = 0;
    const seen = new WeakSet();
    const collect = node => {
      if (!(node instanceof Element)) return;
      for (const splash of [node, ...node.querySelectorAll('.entry-splash')]) {
        if (splash.matches('.entry-splash') && !seen.has(splash)) { seen.add(splash); window.__startupSplashes++; }
      }
    };
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(collect))).observe(document, { childList: true, subtree: true });
  ` });
  try {
    await page.goto(new URL("/home", origin).href, { timeout: 60000 });
    await page.waitForFunction(() => window.__startupSplashes > 0 && !document.querySelector(".entry-splash"), undefined, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__startupSplashes), 1, "Auth preparation and home entry must share exactly one splash");
    await page.click('button[aria-label="강단 라인업 자동화 시작하기"]');
    await page.waitForFunction(() => location.pathname === "/weekly" && !document.querySelector("[data-weekly-intro]"), undefined, { timeout: 60000 });
    assert.equal(await page.evaluate(() => window.__startupSplashes), 1, "Page navigation must not replay the app startup splash");
    await page.click('button[aria-label="홈"]');
    await page.waitForFunction(() => location.pathname === "/home");
    assert.equal(await page.evaluate(() => window.__startupSplashes), 1, "Returning home must not replay startup");
    await page.goto(new URL("/weekly?step=1", origin).href, { timeout: 60000 });
    await page.waitForFunction(() => window.__startupSplashes > 0 && !document.querySelector(".entry-splash"), undefined, { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__startupSplashes), 1, "Direct weekly entry must use the same single startup splash");
    return { splashCount: 1, pageNavigationReplay: false, directWeeklySplashCount: 1 };
  } finally {
    await page.cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
}

export async function verifyBulletinSkeleton(page, origin) {
  const { identifier } = await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__originalDetailFetch = window.fetch;
    const gate = new Promise(resolve => { window.__releaseDetailLoad = resolve; });
    window.fetch = (...args) => {
      const url = new URL(args[0] instanceof Request ? args[0].url : args[0], location.href);
      if (url.pathname === '/bulletins' && new Headers(args[1]?.headers).has('Next-Action')) {
        window.__detailRequestHeld = true;
        return gate.then(() => window.__originalDetailFetch(...args));
      }
      return window.__originalDetailFetch(...args);
    };
  ` });
  try {
    await page.goto(new URL("/home", origin).href, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('[data-bulletin-id="2026-11-08"]') && !document.querySelector('.entry-splash'), undefined, { timeout: 30000 });
    await page.click('[data-bulletin-id="2026-11-08"] a');
    await page.waitForSelector('main[aria-label="주보 상세 불러오는 중"]', { timeout: 60000 });
    const state = await page.evaluate(() => ({
      skeletons: document.querySelectorAll('main[aria-busy="true"] [data-slot="skeleton"]').length,
      splash: !!document.querySelector(".entry-splash"),
      temporaryText: document.body.textContent.includes("주보를 불러오는 중이에요"),
    }));
    assert.ok(state.skeletons > 0, "Detail page loading must use its own skeleton");
    assert.equal(state.splash, false, "A page data request must not restart HU/CU");
    assert.equal(state.temporaryText, false);
    return state;
  } finally {
    await page.evaluate(() => { window.__releaseDetailLoad(); window.fetch = window.__originalDetailFetch; });
    await page.cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
}
