#!/bin/sh
# Usage: scripts/check-sidebar.sh <ego task-space id>, with /home open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const task = await taskSpace($1);
const page = task.page("p1");
if (new URL(await page.url()).pathname !== "/home") throw new Error("Open /home in p1 first");
await page.cdp("Emulation.setDeviceMetricsOverride", {width:1440,height:1024,deviceScaleFactor:1,mobile:false});
await page.cdp("Network.enable");
await page.cdp("Network.setCacheDisabled", {cacheDisabled:true});
try {
  await page.reload({timeout:30000});
  await page.waitForSelector('button[aria-label="사이드바 접기"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-slot="sidebar-container"] img')].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.complete&&i.naturalWidth>0));
  await page.waitForLoadState("networkidle", {timeout:30000, idleMs:500});
  await page.cdp("Network.emulateNetworkConditions", {offline:false,latency:180,downloadThroughput:500000,uploadThroughput:500000});
  const brandHeight = await page.evaluate(() => document.querySelector('[data-slot="sidebar-header"] button > span').getBoundingClientRect().height);
  for (let cycle=0; cycle<3; cycle++) {
    for (const [label, width] of [["사이드바 접기",46],["사이드바 펼치기",256]]) {
      await page.evaluate(({label,width}) => {
        window.__sidebarFrames = {frames:[],done:false};
        let start;
        let settled=0;
        const sidebar=document.querySelector('[data-slot="sidebar-container"]');
        function record() {
          const missing=[...sidebar.querySelectorAll('img')].filter(image=>{
            let opacity=1;
            for(let e=image;e&&e!==sidebar;e=e.parentElement) opacity*=Number(getComputedStyle(e).opacity);
            return image.getBoundingClientRect().width>0&&opacity>0.1&&(!image.complete||image.naturalWidth===0);
          }).length;
          window.__sidebarFrames.frames.push({width:sidebar.getBoundingClientRect().width,missing,brandHeight:sidebar.querySelector('[data-slot="sidebar-header"] button > span').getBoundingClientRect().height});
          settled=Math.abs(sidebar.getBoundingClientRect().width-width)<0.5?settled+1:0;
          if(settled<3&&performance.now()-start<5000) requestAnimationFrame(record); else window.__sidebarFrames.done=true;
        }
        document.querySelector('button[aria-label="'+label+'"]').addEventListener("click", () => {
          start=performance.now();
          requestAnimationFrame(record);
        }, {once:true});
      }, {label,width});
      await page.click('button[aria-label="'+label+'"]');
      await page.waitForFunction(()=>window.__sidebarFrames.done);
      const frames=await page.evaluate(()=>window.__sidebarFrames.frames);
      if(frames.some(f=>f.missing)) throw new Error("SIDEBAR_FLICKER: visible image not decoded");
      if(frames.some(f=>f.brandHeight>brandHeight+1)) throw new Error("SIDEBAR_FLICKER: brand text wraps during transition");
      if(Math.abs(frames.at(-1).width-width)>0.5) throw new Error("Sidebar width "+frames.at(-1).width+"; expected "+width);
    }
  }
  console.log("PASS: 3 cold-cache close/open cycles; no blank images or wrapping captions");
} finally {
  await page.cdp("Network.setCacheDisabled", {cacheDisabled:false});
  await page.cdp("Network.emulateNetworkConditions", {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await page.evaluate(()=>{delete window.__sidebarFrames;});
}
JS
