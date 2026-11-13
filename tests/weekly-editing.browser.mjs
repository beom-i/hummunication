import assert from 'node:assert/strict';
export async function verifyLivePreview(page) {
  await page.waitForSelector('#sermon-content', {timeout:60000});
  await page.waitForFunction(()=>document.querySelector('.weekly-preview-panel [role="img"]') && !document.querySelector('.weekly-preview-panel [data-slot="skeleton"]'),undefined,{timeout:30000});
  await page.evaluate(()=>{
    window.__previewSkeletons=0;
    window.__previewObserver=new MutationObserver(records=>{
      for(const record of records) for(const node of record.addedNodes) if(node instanceof Element && (node.matches('[data-slot="skeleton"]')||node.querySelector('[data-slot="skeleton"]'))) window.__previewSkeletons++;
    });
    window.__previewObserver.observe(document.querySelector('.weekly-preview-panel'),{childList:true,subtree:true});
  });
  await page.focus('#sermon-content');
  await page.press('#sermon-content','ControlOrMeta+End');
  const marker = ` 실시간 미리보기 확인 ${Date.now()}`;
  await page.keyboard.insertText(marker);
  await page.waitForFunction(marker=>document.querySelector('.weekly-preview-panel')?.textContent.includes(marker),marker,{timeout:30000});
  const state=await page.evaluate(()=>{window.__previewObserver.disconnect();return {skeletons:window.__previewSkeletons,contentVisible:document.querySelector('.weekly-preview-panel').textContent.includes('실시간 미리보기 확인')};});
  console.log(state);assert.equal(state.skeletons,0,'Typing must keep the preview visible instead of replacing it with skeletons');
}

export async function verifyRecoveredSave(page, origin) {
  const date = "2035-01-07";
  const data = {
    date, sections: ["sermon"], families: [], senders: [], sermonThumbnail: "",
    sermon: { date, speaker: "", title: "", bible: "", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "복구된 설교 내용" }] }] }, thumbnailId: null, thumbnailEdit: null },
  };
  const ref = { id: "00000000-0000-4000-8000-000000000010", sermon: null };
  const record = { id: date, ref, data, updatedAt: "2035-01-07T00:00:00.000Z" };
  const { identifier } = await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    const record = ${JSON.stringify(record)};
    sessionStorage.setItem('hummunication.weekly.edit.' + record.id, '1');
    localStorage.setItem('hummunication.weekly.pending.' + record.id, JSON.stringify({ data: record.data, ref: null }));
    const originalFetch = window.fetch;
    window.__recoveryFetch = originalFetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (!new Headers(args[1]?.headers).has('Next-Action')) return response;
      let input;
      try { input = JSON.parse(args[1].body)[0]; } catch { return response; }
      if (input?.values) window.__submittedRef = input.ref;
      const body = (await response.text()).split('\\n').map(line => {
        const colon = line.indexOf(':');
        try {
          const value = JSON.parse(line.slice(colon + 1));
          if (typeof value?.ok === 'boolean') return line.slice(0, colon + 1) + JSON.stringify({ ok: true, data: record });
        } catch {}
        return line;
      }).join('\\n');
      return new Response(body, { status: response.status, headers: response.headers });
    };
  ` });
  try {
    await page.goto(new URL(`/weekly?bulletin=${date}&step=2&view=sermon-preview`, origin).href, { timeout: 60000, waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('#sermon-content')?.textContent.includes('복구된 설교 내용') && !document.querySelector('.entry-splash'), undefined, { timeout: 60000 });
    await page.focus('button:text-is("저장")');
    await page.press('button:text-is("저장")', 'Enter');
    await page.waitForFunction(() => window.__submittedRef !== undefined, undefined, { timeout: 30000 });
    const submitted = await page.evaluate(() => window.__submittedRef);
    assert.deepEqual(submitted, ref, "A browser draft without an ID must retain the loaded server identity when resaved");
    return { recoveredServerIdentity: true };
  } finally {
    await page.cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
}

export async function verifySaveConflict(page) {
  const error = { code: "CONFLICT", message: "이 발행일의 주보가 이미 있어요. 저장된 주보를 열어 이어서 편집해 주세요", fields: { "values.date": ["이 발행일의 주보가 이미 있어요"] } };
  await page.evaluate(error => {
    window.__conflictFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await window.__conflictFetch(...args);
      if (!new Headers(args[1]?.headers).has('Next-Action')) return response;
      const body = (await response.text()).split('\n').map(line => {
        const colon = line.indexOf(':');
        try {
          if (typeof JSON.parse(line.slice(colon + 1))?.ok === 'boolean') return line.slice(0, colon + 1) + JSON.stringify({ ok: false, error });
        } catch {}
        return line;
      }).join('\n');
      return new Response(body, { status: response.status, headers: response.headers });
    };
  }, error);
  try {
    await page.focus('button:text-is("저장")');
    await page.press('button:text-is("저장")', 'Enter');
    await page.waitForSelector('a:text-is("저장된 주보 열기")', { timeout: 60000 });
    const state = await page.evaluate(() => ({ loginLink: [...document.querySelectorAll('.weekly-workspace a')].some(link => link.textContent === '팀원 로그인'), savedBulletinLink: !!document.querySelector('.weekly-workspace a[href*="/bulletins?date="]') }));
    assert.equal(state.loginLink, false, "A date conflict must not display a login action");
    assert.equal(state.savedBulletinLink, true);
    return state;
  } finally {
    await page.evaluate(() => { window.fetch = window.__conflictFetch; });
  }
}
