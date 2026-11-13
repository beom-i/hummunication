import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Requires a local-only signed-JWT auth fixture; state() injects API failure cases.
export async function verifyAuthentication(p, state) {
  const origin=new URL(await p.url()).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname), 'Run against the local auth fixture only');
  const backup=await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('hummunication.')).map(k=>[k,localStorage.getItem(k)]));
  try {
    await p.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
    await state({database:'none',logoutFailure:false});
    await p.goto(origin+'/auth/login?next=%2Fweekly%3Fstep%3D1',{timeout:60000});
    await p.fill('#email','wrong@example.com');await p.fill('#password',randomUUID());await p.click('button[type="submit"]');
    await p.waitForFunction(()=>document.querySelector('[data-sonner-toaster]')?.textContent.includes('이메일 또는 비밀번호'));
    await p.fill('#email','member@example.com');await p.click('button[type="submit"]');
    await p.waitForURL(origin+'/weekly?step=1',{timeout:30000});await p.waitForSelector('.sidebar-profile');await p.waitForSelector('input[name="date"]');
    await p.waitForFunction(()=>!document.querySelector('[data-sonner-toaster]')?.textContent.includes('이메일 또는 비밀번호'));
    await p.hover('.sidebar-profile');await p.waitForSelector('[role="menu"]');
    await p.waitForFunction(()=>document.fonts.status==='loaded');
    const geometry=await p.evaluate(()=>({trigger:document.querySelector('.sidebar-profile').getBoundingClientRect().toJSON(),menu:document.querySelector('[role="menu"]').getBoundingClientRect().toJSON(),triggerFont:getComputedStyle(document.querySelector('.sidebar-profile')).fontFamily,menuFont:getComputedStyle(document.querySelector('[role="menu"]')).fontFamily}));
    assert.ok(geometry.menu.bottom<=geometry.trigger.top);assert.equal(geometry.menuFont,geometry.triggerFont);
    await p.keyboard.press('Escape');await p.click('button[aria-label="사이드바 펼치기"]');await p.hover('.sidebar-profile');await p.waitForSelector('[role="menu"]');
    await p.keyboard.press('Escape');await p.focus('.sidebar-profile');await p.keyboard.press('Enter');await p.waitForSelector('[role="menu"]');
    console.log({desktopProfileMenu:true});
    await state({logoutFailure:true});await p.click('[role="menuitem"]');
    await p.waitForFunction(()=>document.querySelector('[data-sonner-toaster]')?.textContent.includes('로그아웃하지 못했어요'),undefined,{timeout:30000});
    assert.equal(new URL(await p.url()).pathname,'/weekly');
    await state({logoutFailure:false});await p.keyboard.press('Escape');await p.focus('.sidebar-profile');await p.keyboard.press('Enter');await p.waitForSelector('[role="menuitem"]');await p.press('[role="menuitem"]','Enter');
    await p.waitForFunction(()=>location.pathname==='/auth/login'&&document.querySelector('[data-sonner-toaster]')?.textContent.includes('로그아웃했어요'),undefined,{timeout:30000});
    await p.goto(origin+'/weekly?step=1',{timeout:60000});assert.equal(new URL(await p.url()).pathname,'/auth/login');
    await p.fill('#email','member@example.com');await p.fill('#password',randomUUID());await p.click('button[type="submit"]');
    await p.waitForURL(origin+'/weekly?step=1',{timeout:30000});await p.waitForSelector('.sidebar-profile');
    console.log({logoutRetryAndLogin:true});
    await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await p.click('button[aria-label="메뉴 열기"]');await p.waitForSelector('[role="dialog"] .sidebar-profile');await p.click('.sidebar-profile');await p.waitForSelector('[role="menu"]');
    await p.waitForFunction(()=>{const menu=document.querySelector('[role="menu"]');return menu&&Number(getComputedStyle(menu).opacity)>.99;});
    await p.waitForTimeout(300);
    assert.ok(await p.evaluate(()=>{const menu=document.querySelector('[role="menu"]');if(!menu)return false;const r=menu.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[role="menu"]')===menu;}), 'The mobile menu must remain open after the pointer leaves');
    await p.keyboard.press('Escape');await p.cdp('Emulation.clearDeviceMetricsOverride');
    console.log({loginRequired:true,invalidCredentialsToast:true,returnPath:true,oldErrorDismissed:true,hoverMenuAbove:true,matchingFonts:true,keyboardMenu:true,logoutFailureKeepsSession:true,logoutSuccess:true,mobileMenu:true});
    const {runContentEditorRegression}=await import('./content-editors.browser.mjs');
    const editors=await runContentEditorRegression(p);
    assert.ok(editors.livePreviewAndRecovery);
    console.log({authenticatedEditors:true});
    await state({database:'forbidden'});await p.goto(origin+'/home',{timeout:60000});
    await p.waitForFunction(()=>document.querySelector('[data-sonner-toaster]')?.textContent.includes('접근 권한'));
    assert.equal(new URL(await p.url()).pathname,'/home');
    await state({database:'none'});await p.goto(origin+'/weekly?step=1',{timeout:60000});await p.waitForSelector('input[name="date"]');
    await p.click('.weekly-footer button:text-is("저장")');
    await p.waitForFunction(()=>location.pathname==='/auth/login'&&document.querySelector('[data-sonner-toaster]')?.textContent.includes('다시 로그인해 주세요'),undefined,{timeout:30000});
    assert.ok(await p.evaluate(()=>!!localStorage.getItem('hummunication.weekly-draft')));
    console.log({serverForbiddenToast:true,serverUnauthorizedRedirect:true,draftRetained:true});
    await p.goto(origin+'/weekly?step=1',{timeout:60000});await p.waitForSelector('.sidebar-profile');await p.hover('.sidebar-profile');await p.waitForSelector('[role="menuitem"]');await p.click('[role="menuitem"]');
    await p.waitForFunction(()=>location.pathname==='/auth/login');
    console.log({testSessionSignedOut:true});
  } finally {
    await p.goto(origin+'/auth/login',{timeout:60000});
    await p.evaluate(backup=>{const original=new Map(backup);const keys=new Set([...Object.keys(localStorage).filter(k=>k.startsWith('hummunication.')),...original.keys()]);for(const k of keys){if(original.has(k))localStorage.setItem(k,original.get(k));else localStorage.removeItem(k);}},backup);
    await p.cdp('Emulation.clearDeviceMetricsOverride');
    console.log({draftsRestored:true});
  }
}
