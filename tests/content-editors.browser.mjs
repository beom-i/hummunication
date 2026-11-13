import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const reference = JSON.parse(readFileSync(new URL('./fixtures/template-typography.json', import.meta.url), 'utf8'));

export async function runContentEditorRegression(page, screenshotDir) {
  const origin = new URL(await page.url()).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Run only against a local app');
  const date = '2035-01-07';
  const keys = ['hummunication.weekly-draft', `hummunication.weekly-draft.${date}`, `hummunication.weekly.pending.${date}`];
  const backup = await page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), keys);
  const family = index => ({ id: null, name: `예시 ${index}순`, photo: '', photo_id: null, photo_edit: null, leader_name: `순장 ${index}`, leader_answer: '함께 기도하며 성장하는 공동체입니다.', members: [{ name: `순원 ${index}`, answer: '함께 말씀을 나누어서 감사합니다.' }] });
  const values = {
    date, sections: ['thumbnail', 'cover', 'sermon', 'family', 'senders'], sermonThumbnail: '',
    sermon: { date, speaker: '설교자 예시', title: '설교 제목 예시', bible: '사사기 7:1-8', thumbnailId: null, thumbnailEdit: null, content: { type: 'doc', content: reference.sermonPages.flat().map(p => ({ type: 'paragraph', content: p.content })) } },
    families: [family(1), family(2)],
    senders: [{ id: null, name: '파송자 예시', generation: '40', group_name: '예시 순', date, prayer: Array.from({ length: 9 }, (_, i) => `${i + 1}번째 기도제목의 내용과 마지막 문장까지 보존되어야 합니다. `.repeat(3)).join('\n') }],
  };
  const goto = path => page.goto(origin + path, { timeout: 60000 });
  const settled = () => page.waitForFunction(() => document.querySelector('.weekly-content')?.inert === false && !document.querySelector('.weekly-skeleton-layer'));
  async function locationIs(view) {
    await page.waitForFunction(view => new URLSearchParams(location.search).get('view') === view, view);
    await settled();
  }
  try {
    await goto('/home');
    await page.evaluate(values => localStorage.setItem('hummunication.weekly-draft', JSON.stringify(values)), values);
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await goto('/weekly?step=2&view=families'); await settled(); await page.snapshot();
    assert.equal(await page.evaluate(() => document.querySelector('section[aria-label="순 목록"] article img').getBoundingClientRect().width), 164, 'Figma empty-list artwork size');
    await page.click('button[aria-label="예시 1순 편집"]'); await locationIs('family-card-edit');
    assert.equal(await page.evaluate(() => !!document.querySelector('.family-photo-group')), true, 'List edit must open the combined editor directly');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#family-name')).fontWeight), '700', 'Figma group-name weight');
    assert.equal(await page.evaluate(() => document.querySelector('.preview-nav').getBoundingClientRect().width), 48, 'Figma navigation button size');
    await page.fill('input[name="families.0.name"]', '변경한 예시 순');
    await page.waitForFunction(() => document.querySelector('.family-photo-group').textContent.includes('변경한 예시 순'));
    await page.click('button[aria-label="다음 새가족 카드"]');
    await page.fill('textarea[aria-label="순장 답변"]', '입력한 답변이 오른쪽 카드에 바로 표시됩니다.');
    await page.waitForFunction(() => document.querySelector('.family-card-answers').textContent.includes('입력한 답변이 오른쪽 카드에 바로 표시됩니다.'));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('hummunication.weekly-draft'))?.families[0].name === '변경한 예시 순');
    await goto('/weekly?step=2&view=family-card-edit&group=0'); await settled();
    assert.equal(await page.evaluate(() => document.querySelector('#family-name').value), '변경한 예시 순', 'Refresh must preserve the edited form');
    await page.click('.weekly-footer button:text-is("완료하기")'); await locationIs('families');
    assert.equal(await page.evaluate(() => document.querySelector('[aria-label="순 목록"]').textContent.includes('변경한 예시 순')), true);
    await page.click('section[aria-label="순 목록"] > button'); await locationIs('family-card-edit');
    await page.fill('input[name="families.2.name"]', '추가한 예시 순');
    await page.waitForFunction(() => document.querySelector('.family-photo-group').textContent.includes('추가한 예시 순'));
    await page.click('.weekly-footer button:text-is("완료하기")'); await locationIs('families');
    assert.equal(await page.evaluate(() => document.querySelectorAll('section[aria-label="순 목록"] > article').length), 3, 'Adding a group must open the same combined editor and retain existing groups');
    await page.click('.weekly-footer button:text-is("다음")'); await locationIs('senders');
    await page.click('button[aria-label="파송자 예시 편집"]'); await locationIs('sender-edit');
    assert.deepEqual(await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#sender-prayer')); return [s.fontSize, s.borderWidth, s.borderRadius]; }), ['16px', '0px', '10px'], 'Figma prayer input styling');
    await page.waitForFunction(() => document.querySelector('.sender-card-prayers')?.textContent.trim().length > 0);
    const first = await page.evaluate(() => document.querySelector('.sender-card-prayers').textContent);
    await page.click('button[aria-label="다음 파송자 카드"]');
    await page.waitForFunction(first => document.querySelector('.sender-card-prayers').textContent !== first, first);
    assert.equal(await page.evaluate(() => document.querySelector('input[name="senders.0.name"]').value), '파송자 예시', 'Card arrows must keep the same person');
    await page.click('.weekly-footer button:text-is("완료하기")'); await locationIs('senders');
    await page.click('.weekly-footer button:text-is("다음")');
    await page.waitForSelector('[data-artifact-id]', { timeout: 30000 });
    assert.equal(new URL(await page.url()).searchParams.get('step'), '3');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === '전부 ZIP으로 받기').getBoundingClientRect().height), 48, 'Figma ZIP button height');
    assert.ok(await page.evaluate(() => { const a = document.querySelector('[data-artifact-id="bulletin-thumbnail"] .weekly-result-thumb').getBoundingClientRect(); const b = document.querySelector('[data-artifact-id="bulletin-cover"] .weekly-result-thumb').getBoundingClientRect(); return Math.abs(a.height - b.height) < 1; }), 'Landscape artwork and portrait cards share a 4:5 gallery frame');

    for (const [legacy, selector] of [['family-preview', '[aria-label="순 목록"]'], ['family-edit', '.weekly-editor-layout']]) {
      await goto(`/weekly?step=2&view=${legacy}&group=0`); await settled();
      assert.equal(await page.evaluate(selector => !!document.querySelector(selector), selector), true);
      assert.equal(await page.evaluate(() => document.body.textContent.includes('공통 표지')), false, 'Removed overview must not appear through an old URL');
    }
    const layouts = [];
    for (const width of [1440, 820, 390]) {
      await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width < 768 });
      for (const view of ['sermon', 'sermon-preview', 'family-card-edit', 'sender-edit']) {
        await goto(`/weekly?step=2&view=${view}&group=0`); await settled();
        await page.waitForFunction(() => document.fonts.status === 'loaded');
        const geometry = await page.evaluate(() => {
          const layout = document.querySelector('.weekly-editor-layout');
          const form = layout.querySelector('.weekly-editor-form').getBoundingClientRect();
          const preview = layout.querySelector('.weekly-preview-panel').getBoundingClientRect();
          return { form: form.toJSON(), preview: preview.toJSON(), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.equal(geometry.overflow, false, `${width}px ${view} overflow`);
        if (width >= 1200) {
          assert.ok(geometry.preview.left >= geometry.form.right, `${view}: preview must be right of form`);
          assert.ok(Math.abs(geometry.form.top - geometry.preview.top) < 1, `${view}: top edges must align`);
        } else assert.ok(geometry.preview.top >= geometry.form.bottom, `${view}: mobile/tablet form must come first`);
        assert.equal(await page.evaluate(() => !!document.querySelector('.weekly-footer')), true, 'All editors must share the same footer');
        await page.evaluate(() => document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).forEach(a => a.finish()));
        if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${width}-${view}.png`, fullPage: width < 1200 });
        layouts.push({ width, view });
      }
    }
    return { layouts, familyListEditorRoundTrip: true, livePreviewAndRecovery: true, senderPageNavigation: true, removedOverview: true };
  } finally {
    await goto('/home');
    await page.evaluate(backup => { for (const [key, value] of backup) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } }, backup);
    await page.cdp('Emulation.clearDeviceMetricsOverride');
  }
}
