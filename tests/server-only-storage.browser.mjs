import assert from 'node:assert/strict';
import { mockWeeklyRecord } from './weekly-record.browser.mjs';

export async function verifyServerOnlyStorage(page) {
  const origin = new URL(await page.url()).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local app only');
  const date = '2035-01-07';
  const data = {
    date, sections: ['sermon'], sermonThumbnail: '', families: [], senders: [],
    sermon: { date, speaker: '', title: '서버에 저장한 제목', bible: '', thumbnailId: null, thumbnailEdit: null, content: { type: 'doc', content: [{ type: 'paragraph' }] } },
  };
  const stale = { ...data, sermon: { ...data.sermon, title: '사용하면 안 되는 임시본' } };
  const entries = [
    ['hummunication.weekly-draft', JSON.stringify(stale)],
    [`hummunication.weekly-draft.${date}`, JSON.stringify(stale)],
    [`hummunication.weekly.pending.${date}`, JSON.stringify({ data: stale, ref: null })],
    ['hummunication.weekly.saved', JSON.stringify([{ id: date, data: stale, updatedAt: `${date}T00:00:00.000Z` }])],
  ];
  const backup = await page.evaluate(entries => entries.map(([key]) => [key, localStorage.getItem(key)]), entries);
  const fixture = await mockWeeklyRecord(page, data);
  try {
    await page.evaluate(entries => { for (const [key, value] of entries) localStorage.setItem(key, value); }, entries);
    await page.goto(`${origin}/weekly?step=2&view=sermon`);
    await page.waitForSelector('#sermon-title');
    assert.equal(await page.evaluate(() => document.querySelector('#sermon-title').value), '', 'New work must ignore legacy browser drafts');
    await page.fill('#sermon-title', '저장하지 않은 입력');
    await page.reload();
    await page.waitForSelector('#sermon-title');
    assert.equal(await page.evaluate(() => document.querySelector('#sermon-title').value), '', 'Unsaved input must not survive reload');

    await fixture.goto('/weekly?step=2&view=sermon');
    await page.waitForFunction(() => document.querySelector('#sermon-title')?.value === '서버에 저장한 제목');
    await page.fill('#sermon-title', '저장 실패 후 유지할 입력');
    // The read-only server fixture rejects saves, without touching a real database.
    await page.click('.weekly-footer button:text-is("저장")');
    await page.waitForFunction(() => document.querySelector('.weekly-footer [role="alert"]')?.textContent.includes('저장 결과'));
    assert.equal(await page.evaluate(() => document.querySelector('#sermon-title').value), '저장 실패 후 유지할 입력');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#sermon-title')?.value === '서버에 저장한 제목');
    assert.deepEqual(await page.evaluate(entries => entries.map(([key]) => [key, localStorage.getItem(key)]), entries), entries, 'The app must neither update nor restore browser content');
    return { ignoresBrowserDrafts: true, serverReload: true, failedSaveKeepsLiveInput: true, noBrowserWrites: true };
  } finally {
    await fixture.dispose();
    await page.goto(`${origin}/home`);
    await page.evaluate(backup => { for (const [key, value] of backup) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } }, backup);
  }
}
