import assert from "node:assert/strict";

export async function runFigmaUiRegression(page) {
  const origin = new URL(await page.url()).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Run only against a local app');
  const key = 'hummunication.weekly-draft';
  const backup = await page.evaluate(key => localStorage.getItem(key), key);
  const goto = path => page.goto(origin + path, { timeout: 60000 });
  const settled = () => page.waitForFunction(() => !document.querySelector('.weekly-skeleton-layer') && document.querySelector('.weekly-content')?.inert === false);
  const style = (selector, properties) => page.evaluate(({ selector, properties }) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    const computed = getComputedStyle(element);
    return Object.fromEntries(properties.map(property => [property, computed[property]]));
  }, { selector, properties });
  const checks = [];
  async function check(label, selector, expected) {
    assert.deepEqual(await style(selector, Object.keys(expected)), expected, label);
    checks.push(label);
  }
  try {
    await goto('/home');
    await page.evaluate(({ key }) => localStorage.setItem(key, JSON.stringify({
      date: '2035-01-07', sections: ['thumbnail', 'cover', 'sermon', 'family', 'senders'], sermonThumbnail: '',
      sermon: { date: '2035-01-07', speaker: '설교자 예시', title: '제목 예시', bible: '본문 예시', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문 예시입니다.' }] }] } },
      families: [{ id: null, name: '예시 순', photo: '', photo_id: null, photo_edit: null, leader_name: '순장 예시', leader_answer: '답변 예시', members: [{ name: '순원 예시', answer: '답변 예시' }] }],
      senders: [{ id: null, name: '파송자 예시', generation: '40', group_name: '예시 순', date: '2035-01-07', prayer: '기도제목 예시' }],
    })), { key });
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await goto('/weekly?step=1'); await settled();
    await check('Date typography', 'label[for="2026-11-08"] > span', { fontSize: '18px', letterSpacing: '-0.36px' });
    await check('Progress tracking', '.progress-step', { letterSpacing: '-0.45px' });
    await check('Substep tracking', '.progress-substep', { letterSpacing: '-0.39px' });
    await goto('/weekly?step=2&view=sermon'); await settled();
    await check('Sermon input typography and radius', '#sermon-speaker', { fontWeight: '500', letterSpacing: '-0.48px', borderRadius: '12px' });
    await goto('/weekly?step=2&view=families'); await settled();
    await check('Empty-list artwork', 'section[aria-label="순 목록"] article img', { width: '164px', height: '164px' });
    await check('Entry action colors and tracking', 'section[aria-label="순 목록"] article button:last-child', { backgroundColor: 'rgb(240, 240, 240)', color: 'rgb(22, 32, 26)', letterSpacing: '-0.48px' });
    await goto('/weekly?step=2&view=family-card-edit&group=0'); await settled();
    await check('Group-name typography', '#family-name', { fontWeight: '700', letterSpacing: '-0.32px', paddingLeft: '14px' });
    await check('Card navigation geometry', '.preview-nav', { width: '48px', height: '48px', backgroundColor: 'rgb(255, 255, 255)' });
    assert.ok(await page.evaluate(() => document.querySelector('.preview-nav img').src.endsWith('/23c16.svg')), 'Use the original Figma arrow');
    await goto('/weekly?step=2&view=sender-edit&group=0'); await settled();
    await check('Prayer input', '#sender-prayer', { fontSize: '16px', borderWidth: '0px', borderRadius: '10px', paddingLeft: '14px', paddingTop: '10px' });
    await goto('/weekly?step=3'); await page.waitForSelector('[data-artifact-id]'); await settled();
    await check('ZIP button', '.weekly-zip-button', { height: '48px', borderRadius: '16px', backgroundColor: 'rgb(107, 243, 149)', letterSpacing: '-0.48px' });
    await check('Result filter', '.weekly-result-filter[aria-pressed="false"]', { fontWeight: '600', letterSpacing: '-0.42px', backgroundColor: 'rgb(255, 255, 255)' });
    await check('Result filter count', '.weekly-result-filter[aria-pressed="false"] > span', { color: 'rgb(176, 184, 193)' });
    await check('Download selection typography', '.weekly-download-bar > span', { fontSize: '16px', fontWeight: '700' });
    assert.equal(await page.evaluate(() => document.querySelector('[data-artifact-id="bulletin-thumbnail"] [data-export-html]').dataset.exportHeight), '514', 'Gallery framing must retain the native landscape export');
    for (const width of [1440, 820, 390]) {
      await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width < 768 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px results overflow`);
      assert.ok(await page.evaluate(() => { const r = document.querySelector('.weekly-download-bar').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), `${width}px download bar must fit`);
    }
    return { checks, resultWidths: [1440, 820, 390] };
  } finally {
    await goto('/home');
    await page.evaluate(({ key, backup }) => { if (backup === null) localStorage.removeItem(key); else localStorage.setItem(key, backup); }, { key, backup });
    await page.cdp('Emulation.clearDeviceMetricsOverride');
  }
}
