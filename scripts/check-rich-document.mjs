import assert from 'node:assert/strict';
import { richDocumentSchema, documentFromText, documentText } from '../src/components/ui/rich-text-editor/schemas.ts';
import { photoGeometry, centeredPhotoCrop } from '../src/components/weekly/photo-crop-geometry.ts';

assert.equal(documentText(richDocumentSchema.parse(documentFromText('A\n\n한글 😀'))), 'A\n\n한글 😀');
for (const attrs of [{ color: 'red;position:fixed' }, { color: '<script>' }, { fontSize: '100px' }, { fontSize: 'url(x)' }]) {
  assert.equal(richDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test', marks: [{ type: 'textStyle', attrs }] }] }] }).success, false);
}
assert.equal(richDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://example.com' } }] }).success, false);
assert.equal(richDocumentSchema.safeParse(documentFromText('x'.repeat(20001))).success, false);
const doc = richDocumentSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'safe', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }, { type: 'strike' }, { type: 'textStyle', attrs: { color: 'rgb(185, 35, 48)', fontSize: '18px' } }] }] }] });
assert.equal(doc.content[0].content[0].marks[4].attrs.color, '#B92330');
console.log('PASS: rich document, preserved newlines, allowed marks, normalized colors, hostile CSS/nodes, text limit');
for (const [width, height] of [[1200, 800], [800, 1200], [100, 100]]) {
  for (const rotation of [0, 90, 180, 270]) {
    const crop = centeredPhotoCrop(width, height, rotation);
    const bounds = photoGeometry(width, height, rotation);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= 1 && crop.y + crop.height <= 1);
    assert.ok(Math.abs(crop.width * bounds.width / (crop.height * bounds.height) - 119 / 71) < 0.00001);
  }
}
assert.deepEqual(photoGeometry(1200, 800, 90), { width: 800, height: 1200, transform: 'translate(800 0) rotate(90)' });
console.log('PASS: bounded fixed-aspect selections for landscape, portrait, square and all quarter turns');

const { bulletinDateCode, bulletinTitle, bulletinHref } = await import('../src/components/bulletins/format.ts');
assert.equal(bulletinDateCode('2030-12-31'), '301231');
assert.equal(bulletinDateCode('2030-01-01'), '300101');
assert.equal(bulletinTitle('2030-12-31'), '12월 다섯째주 주보');
assert.equal(bulletinHref('2030-12-31'), '/bulletins?date=2030-12-31');
console.log('PASS: publication date edit code, week title and detail URL');
