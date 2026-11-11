import assert from 'node:assert/strict';
import { richDocumentSchema, documentFromText, documentText } from '../src/components/ui/rich-text-editor/schemas.ts';

assert.equal(documentText(richDocumentSchema.parse(documentFromText('A\n\n한글 😀'))), 'A\n\n한글 😀');
for (const attrs of [{ color: 'red;position:fixed' }, { color: '<script>' }, { fontSize: '100px' }, { fontSize: 'url(x)' }]) {
  assert.equal(richDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test', marks: [{ type: 'textStyle', attrs }] }] }] }).success, false);
}
assert.equal(richDocumentSchema.safeParse({ type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://example.com' } }] }).success, false);
assert.equal(richDocumentSchema.safeParse(documentFromText('x'.repeat(20001))).success, false);
const doc = richDocumentSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'safe', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }, { type: 'strike' }, { type: 'textStyle', attrs: { color: 'rgb(185, 35, 48)', fontSize: '18px' } }] }] }] });
assert.equal(doc.content[0].content[0].marks[4].attrs.color, '#B92330');
console.log('PASS: rich document, preserved newlines, allowed marks, normalized colors, hostile CSS/nodes, text limit');
