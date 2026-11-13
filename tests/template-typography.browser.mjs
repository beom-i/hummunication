import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const reference = JSON.parse(readFileSync(new URL('./fixtures/template-typography.json', import.meta.url), 'utf8'));

// Run against the actual app loaded with the source Figma content, before taking PNGs.
export async function verifyTemplateTypography(page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  const result = await page.evaluate(() => {
    function linesOf(element) {
      const lines = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode())) for (let i = 0; i < text.length; i++) {
        const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        let line = lines.find(row => Math.abs(row.top - rect.top) < 4);
        if (!line) { line = { top: rect.top, text: '' }; lines.push(line); }
        line.text += text.textContent[i];
      }
      return lines.map(line => line.text.trimEnd());
    }
    const title = document.querySelector('.bulletin-thumbnail-card .bulletin-church');
    const paragraphs = [...document.querySelectorAll('.sermon-sheet-body')].map(body => {
      const sheet = body.closest('.template-sheet'), scale = sheet.getBoundingClientRect().width / 720;
      return { width: body.offsetWidth, paragraphs: [...body.children].map(p => ({ text: p.textContent, lines: linesOf(p), top: (p.getBoundingClientRect().top - sheet.getBoundingClientRect().top) / scale })) };
    });
    const prayers = [...document.querySelectorAll('.sender-card-prayers p')].map(p => {
      const sheet = p.closest('.template-sheet'), scale = sheet.getBoundingClientRect().width / 720;
      return { text: p.textContent, width: p.offsetWidth, lines: linesOf(p), top: (p.getBoundingClientRect().top - sheet.getBoundingClientRect().top) / scale };
    });
    return { thumbnail: { fontSize: getComputedStyle(title).fontSize, width: title.offsetWidth, lineHeight: getComputedStyle(title).lineHeight }, paragraphs, prayers };
  });
  assert.deepEqual(result.thumbnail, { fontSize: '90px', width: 397, lineHeight: '110px' }, 'The thumbnail variant must override the shared bulletin style');
  assert.equal(result.paragraphs.length, reference.sermonPages.length);
  reference.sermonPages.forEach((paragraphs, pageIndex) => {
    assert.equal(result.paragraphs[pageIndex].width, 610);
    paragraphs.forEach((paragraph, index) => {
      const actual = result.paragraphs[pageIndex].paragraphs[index];
      assert.equal(actual?.text, paragraph.content.map(node => node.text).join(''), `Source content ${paragraph.nodeId}`);
      assert.deepEqual(actual.lines, paragraph.lines, `Figma line breaks ${paragraph.nodeId}`);
      assert.ok(Math.abs(actual.top - paragraph.top) < 0.1, `Figma paragraph position ${paragraph.nodeId}: ${actual.top} / ${paragraph.top}`);
    });
  });
  reference.senderPrayers.forEach((prayer, index) => {
    const actual = result.prayers[index];
    assert.equal(actual?.text, prayer.text);
    assert.equal(actual.width, 549);
    assert.deepEqual(actual.lines, prayer.lines, `Figma prayer wrapping ${prayer.nodeId}`);
    assert.ok(Math.abs(actual.top - prayer.top) < 0.1, `Figma prayer position ${prayer.nodeId}: ${actual.top} / ${prayer.top}`);
  });
  await page.cdp('DOM.enable');
  await page.cdp('CSS.enable');
  const { root } = await page.cdp('DOM.getDocument');
  for (const [selector, postScriptName] of [
    ['.sermon-sheet-body p', 'PretendardVariable-Regular'],
    ['.sermon-sheet-body strong', 'PretendardVariable-Bold'],
    ['.sermon-point', 'PretendardVariable-Bold'],
    ['.sender-card-prayers p', 'PretendardVariable-Medium'],
  ]) {
    const { nodeId } = await page.cdp('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = await page.cdp('CSS.getPlatformFontsForNode', { nodeId });
    assert.ok(fonts.some(font => font.postScriptName === postScriptName && font.glyphCount > 0), `Actual rendered font ${selector}`);
    assert.ok(fonts.every(font => font.isCustomFont && font.familyName === 'Pretendard Variable'), `No system fallback ${selector}`);
  }
  return { thumbnail: result.thumbnail, sermonParagraphs: reference.sermonPages.flat().length, prayerParagraphs: result.prayers.length };
}

export async function runTemplateTypographyRegression(page) {
  const url = new URL(await page.url());
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only run this fixture against the local app');
  const key = 'hummunication.weekly-draft';
  const backup = await page.evaluate(key => localStorage.getItem(key), key);
  const values = {
    date: '2035-01-07', sections: ['thumbnail', 'cover', 'sermon', 'family', 'senders'], sermonThumbnail: '',
    sermon: { date: '2035-01-07', speaker: '설교자 예시', title: '설교 제목 예시', bible: '사사기 7:1-8', thumbnailId: null, thumbnailEdit: null, content: { type: 'doc', content: reference.sermonPages.flat().map(paragraph => ({ type: 'paragraph', content: paragraph.content })) } },
    families: [{ id: null, name: '예시 순', photo: '', photo_id: null, photo_edit: null, leader_name: '순장 예시', leader_answer: '함께 기도하는 공동체입니다.', members: [{ name: '순원 예시', answer: '함께해서 감사합니다.' }] }],
    senders: [{ id: null, name: '파송자 예시', generation: '40', group_name: '예시 순', date: '2035-01-07', prayer: reference.senderPrayers.map(prayer => prayer.text).join('\n') }],
  };
  try {
    await page.goto(url.origin + '/home');
    await page.evaluate(({ key, values }) => localStorage.setItem(key, JSON.stringify(values)), { key, values });
    await page.goto(url.origin + '/weekly?step=3');
    await page.waitForSelector('section[aria-label="결과물 목록"]', { timeout: 30000 });
    return await verifyTemplateTypography(page);
  } finally {
    await page.goto(url.origin + '/home');
    await page.evaluate(({ key, backup }) => { if (backup === null) localStorage.removeItem(key); else localStorage.setItem(key, backup); }, { key, backup });
  }
}
