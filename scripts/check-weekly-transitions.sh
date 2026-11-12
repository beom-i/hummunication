#!/bin/sh
# Usage: scripts/check-weekly-transitions.sh <ego task-space id>, with /weekly open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const task = await taskSpace($1);
const page = task.page("p1");
const origin = new URL(await page.url()).origin;
async function settled(step) {
  await page.waitForFunction(step => location.search === "?step=" + step && !document.querySelector(".weekly-skeleton-layer") && document.querySelector(".weekly-content")?.inert === false, step);
}
async function checkSkeleton(view) {
  const result = await page.evaluate(() => ({ views: window.__weeklyTransitionQA.views, sidebar: window.__weeklyTransitionQA.sidebar }));
  if (!result.views.includes(view) || !result.sidebar) throw new Error("Missing body/sidebar skeleton: " + JSON.stringify(result));
  await page.evaluate(() => { window.__weeklyTransitionQA.views = []; window.__weeklyTransitionQA.sidebar = false; });
}
try {
  for (const width of [1440, 820, 390]) {
    await page.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await page.goto(origin + "/weekly?step=1");
    await settled(1);
    await page.evaluate(() => {
      const qa = window.__weeklyTransitionQA = { views: [], sidebar: false, pops: 0 };
      qa.onPop = () => { qa.pops++; };
      window.addEventListener("popstate", qa.onPop);
      qa.observer = new MutationObserver(() => {
        const layer = document.querySelector(".weekly-skeleton-layer");
        if (!layer) return;
        const view = layer.querySelector("[data-skeleton-view]")?.dataset.skeletonView;
        if (!qa.views.includes(view)) qa.views.push(view);
        qa.sidebar ||= document.querySelector(".progress-sidebar")?.dataset.loading === "true";
      });
      qa.observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    await page.click('button[aria-label="유형 선택"]');
    await settled(2);
    await checkSkeleton("options");
    await page.evaluate(() => history.back());
    await settled(1);
    await checkSkeleton("date");
    await page.evaluate(() => history.forward());
    await settled(2);
    await checkSkeleton("options");
    await page.evaluate(() => { history.back(); setTimeout(() => history.forward(), 30); });
    await page.waitForFunction(() => window.__weeklyTransitionQA.pops >= 4);
    await settled(2);
    const geometry = await page.evaluate(() => {
      const title = document.querySelector(".weekly-heading h1").getBoundingClientRect();
      const sidebar = document.querySelector(".progress-sidebar").getBoundingClientRect();
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, content: document.querySelector(".weekly-main").scrollWidth, overlap: title.right > sidebar.left && title.left < sidebar.right && title.top < sidebar.bottom && title.bottom > sidebar.top };
    });
    if (geometry.document > geometry.viewport || geometry.content > geometry.viewport) throw new Error("Horizontal overflow: " + JSON.stringify(geometry));
    if (geometry.overlap) throw new Error("Progress sidebar covers the title: " + JSON.stringify(geometry));
    await page.evaluate(() => { window.__weeklyTransitionQA.observer.disconnect(); window.removeEventListener("popstate", window.__weeklyTransitionQA.onPop); delete window.__weeklyTransitionQA; });
    console.log("PASS: " + width + "px next/back/forward, rapid history and body/sidebar skeletons");
  }
  await page.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await page.click('button[aria-label="날짜 선택"]');
  await settled(1);
  await page.click('button[aria-label="유형 선택"]');
  await settled(2);
  const animation = await page.evaluate(() => getComputedStyle(document.querySelector(".type-collage-slot")).animationName);
  if (animation !== "none") throw new Error("Reduced motion still animates the collage");
  console.log("PASS: reduced motion finishes without an inert page or animation");
} finally {
  await page.cdp("Emulation.setEmulatedMedia", { features: [] });
  await page.cdp("Emulation.clearDeviceMetricsOverride");
  await page.evaluate(() => { const qa = window.__weeklyTransitionQA; if (qa) { qa.observer.disconnect(); window.removeEventListener("popstate", qa.onPop); delete window.__weeklyTransitionQA; } });
}
JS
