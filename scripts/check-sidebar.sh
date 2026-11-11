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
  await page.waitForSelector('.entry-splash', {state:"hidden", timeout:10000});
  await page.waitForSelector('button[aria-label="사이드바 접기"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-slot="sidebar-container"] img')].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.complete&&i.naturalWidth>0));
  await page.waitForLoadState("networkidle", {timeout:30000, idleMs:500});
  await page.cdp("Network.emulateNetworkConditions", {offline:false,latency:180,downloadThroughput:500000,uploadThroughput:500000});
  const brandHeight = await page.evaluate(() => document.querySelector('[data-slot="sidebar-header"] button > span').getBoundingClientRect().height);
  for (let cycle=0; cycle<3; cycle++) {
    for (const [label, width] of [["사이드바 접기",64],["사이드바 펼치기",256]]) {
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
          window.__sidebarFrames.frames.push({width:sidebar.getBoundingClientRect().width,gap:document.querySelector('[data-slot="sidebar-gap"]').getBoundingClientRect().width,missing,brandHeight:sidebar.querySelector('[data-slot="sidebar-header"] button > span').getBoundingClientRect().height});
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
      if(frames.some(f=>Math.abs(f.width-f.gap)>1)) throw new Error("Sidebar and content move at different speeds");
      if(Math.abs(frames.at(-1).width-width)>0.5) throw new Error("Sidebar width "+frames.at(-1).width+"; expected "+width);
    }
  }
  console.log("PASS: 3 cold-cache close/open cycles; no blank images or wrapping captions");
} finally {
  await page.cdp("Network.setCacheDisabled", {cacheDisabled:false});
  await page.cdp("Network.emulateNetworkConditions", {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await page.evaluate(()=>{delete window.__sidebarFrames;});
}
await page.click('button[aria-label="사이드바 접기"]');
await page.waitForFunction(()=>Math.abs(document.querySelector('[data-slot="sidebar-container"]').getBoundingClientRect().width-64)<0.5);
const geometry=await page.evaluate(()=>{
  const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {logo:rect('.sidebar-brand img'),buttons:[...document.querySelectorAll('[data-slot="sidebar-content"] button')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}),avatar:rect('[data-slot="avatar"]')};
});
for(const [index,button] of geometry.buttons.entries()) {
  if(Math.abs(button.x-14)>1||Math.abs(button.y-(104+60*index))>1||Math.abs(button.width-36)>1||Math.abs(button.height-36)>1) throw new Error('Rail button geometry: '+JSON.stringify(geometry));
}
if(Math.abs(geometry.logo.x-18)>1||Math.abs(geometry.logo.y-20)>1||geometry.logo.width!==28||geometry.avatar.width!==28||Math.abs(geometry.avatar.y-976)>1) throw new Error('Rail logo/avatar geometry: '+JSON.stringify(geometry));
await page.click('button[aria-label="카드뉴스 만들기"]');
await page.waitForSelector('text="개발 중이에요"');
if(new URL(await page.url()).pathname!=="/home") throw new Error("Card news opened weekly");
await page.waitForFunction(()=>!document.querySelector('[data-sonner-toast]'));
await page.click('button[aria-label="팀원"]');
await page.waitForSelector('text="개발 중이에요"');
if(new URL(await page.url()).pathname!=="/home") throw new Error("Team left the current page");
await page.click('button[aria-label="강단 라인업 자동화 시작하기"]');
await page.waitForURL('**/weekly?step=1&intro=1');
await page.waitForSelector('.weekly-main h1', {timeout:10000});
await page.click('button[aria-label="카드뉴스 만들기"]');
if(new URL(await page.url()).pathname!=="/weekly") throw new Error("Card news left the current work");
console.log("PASS: Figma rail geometry; card news stays put; automation opens /weekly");
await page.cdp("Emulation.setDeviceMetricsOverride", {width:320,height:800,screenWidth:320,screenHeight:800,deviceScaleFactor:1,mobile:true});
await page.goto(new URL("/weekly?step=1", await page.url()).href);
await page.waitForSelector('.weekly-main h1');
await page.waitForFunction(()=>!document.querySelector('[data-slot="sidebar-container"]'));
await page.click('button[aria-label="메뉴 열기"]');
await page.waitForSelector('[role="dialog"]');
const mobileURL = await page.url();
await page.click('[role="dialog"] button[aria-label="팀원"]');
await page.waitForSelector('[role="dialog"]', {state:"hidden"});
await page.waitForFunction(()=>document.body.style.pointerEvents!=="none"&&!!document.querySelector('[data-sonner-toast]'));
if (!await page.evaluate(()=>{
  const menu = document.querySelector('button[aria-label="메뉴 열기"]');
  const rect = menu.getBoundingClientRect();
  return menu.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
})) throw new Error("Coming-soon notice blocks reopening the mobile menu");
await page.click('button[aria-label="메뉴 열기"]');
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button[aria-label="카드뉴스 만들기"]');
await page.waitForSelector('[role="dialog"]', {state:"hidden"});
if (await page.url()!==mobileURL) throw new Error("Mobile placeholder navigation left the current work");
console.log("PASS: mobile notices close the menu, preserve the page and allow immediate reopening");
JS
