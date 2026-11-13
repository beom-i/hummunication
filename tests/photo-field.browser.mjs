import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function runPhotoFieldRegression(page, screenshotDir) {
  const origin = new URL(await page.url()).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Run only against a local app');
  const key = 'hummunication.weekly-draft';
  const backup = await page.evaluate(key => localStorage.getItem(key), key);
  const directory = await mkdtemp(join(tmpdir(), 'hummunication-photo-'));
  const goto = path => page.goto(origin + path, { timeout: 60000 });
  const settled = () => page.waitForFunction(() => !document.querySelector('.weekly-skeleton-layer') && document.querySelector('.weekly-content')?.inert === false);
  const capture = async name => {
    if (!screenshotDir) return;
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).forEach(a => a.finish()); });
    await page.screenshot({ path: `${screenshotDir}/${name}.png` });
  };
  const source = () => page.evaluate(() => document.querySelector('[data-photo-field] [data-photo-original]')?.getAttribute('data-photo-original') ?? '');
  try {
    await goto('/home');
    const fixture = {
      date: '2035-01-07', sections: ['sermon', 'family'], sermonThumbnail: '',
      sermon: { date: '2035-01-07', speaker: '예시', title: '예시 제목', bible: '예시 본문', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문 예시입니다.' }] }] } },
      families: [{ id: null, name: '예시 순', photo: '', photo_id: null, photo_edit: null, leader_name: '순장 예시', leader_answer: '답변 예시', members: [{ name: '순원 예시', answer: '함께 기도할 수 있어서 좋습니다.' }] }], senders: [],
    };
    await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key, fixture });
    const images = await page.evaluate(() => ['#63ba8a', '#d0aa70'].map(color => {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
      const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 960, 540);
      context.fillStyle = '#ffffff'; context.font = '64px sans-serif'; context.fillText('PHOTO EXAMPLE', 160, 290);
      return canvas.toDataURL('image/png').split(',')[1];
    }));
    const paths = images.map((_, i) => join(directory, `${i}.png`));
    await Promise.all(images.map((data, i) => writeFile(paths[i], Buffer.from(data, 'base64'))));
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    for (const [view, id, label] of [['family-card-edit', 'family-photo', '단체 사진'], ['sermon', 'sermon-thumbnail', '설교 썸네일']]) {
      await goto(`/weekly?step=2&view=${view}&group=0`); await settled(); await page.snapshot();
      assert.ok(await page.evaluate(() => document.querySelector('[data-photo-field] img').src.includes('a02dc.png')), 'Use the Figma upload asset');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-photo-field] button')).borderWidth), '0px');
      await capture(`${view}-empty`);
      await page.setInputFiles(`#${id}`, paths[0]); await page.waitForSelector('[role="dialog"]'); await page.snapshot();
      await page.click('[role="dialog"] button:text-is("취소")');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
      assert.equal(await source(), '', 'Cancel initial upload must retain the empty state');
      await page.setInputFiles(`#${id}`, paths[0]); await page.waitForSelector('[role="dialog"]');
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] button')].some(button => button.textContent === '편집 적용' && !button.disabled));
      await page.snapshot(); await page.click('[role="dialog"] button:text-is("편집 적용")');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
      const original = await source(); assert.ok(original.startsWith('data:image/png;base64,'));
      assert.ok(await page.evaluate(label => {
        const edit = document.querySelector(`[aria-label="${label} 편집"]`).getBoundingClientRect();
        const change = document.querySelector(`[aria-label="${label} 바꾸기"]`).getBoundingClientRect();
        return change.top >= edit.top && change.bottom <= edit.bottom && change.right <= edit.right;
      }, label), 'Photo controls must overlay the photo');
      await capture(`${view}-filled`);
      await page.snapshot(); await page.click(`button[aria-label="${label} 편집"]`); await page.waitForSelector('[role="dialog"]');
      await page.snapshot(); await page.click('[role="dialog"] button:text-is("취소")');
      assert.equal(await source(), original, 'Cancel editing must keep the original');
      await page.snapshot();
      const chooser = page.waitForFileChooser(); await page.click(`button[aria-label="${label} 바꾸기"]`); await (await chooser).setFiles(paths[1]);
      await page.waitForSelector('[role="dialog"]'); await page.snapshot(); await page.click('[role="dialog"] button:text-is("취소")');
      assert.equal(await source(), original, 'Cancel replacement must keep the current photo');
      await page.setInputFiles(`#${id}`, paths[1]); await page.waitForSelector('[role="dialog"]');
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] button')].some(button => button.textContent === '편집 적용' && !button.disabled));
      await page.snapshot(); await page.click('[role="dialog"] button:text-is("편집 적용")');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
      assert.notEqual(await source(), original, 'Apply replacement must update the photo');
      await page.snapshot(); await page.click(`button[aria-label="${label} 삭제"]`);
      assert.equal(await source(), '', 'Delete must reset to the Figma upload state');
    }
    return { familyAndSermon: true, figmaAsset: true, overlayControls: true, uploadEditReplaceCancelDelete: true };
  } finally {
    await goto('/home');
    await page.evaluate(({ key, backup }) => { if (backup === null) localStorage.removeItem(key); else localStorage.setItem(key, backup); }, { key, backup });
    await page.cdp('Emulation.clearDeviceMetricsOverride');
    await rm(directory, { recursive: true, force: true });
  }
}
