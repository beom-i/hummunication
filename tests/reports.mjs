import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const payload = '<img data-report-injection src="data:,">';
for (const [file, tag, inject] of [
  ["backend-code-structure.html", "templates", rows => { rows[0].language = payload; }],
  ["weekly-screen-data-map.html", "screen-data", rows => { rows[0].annotations[0].n = payload; rows[0].image += '" data-report-injection="true'; }],
]) {
  const html = readFileSync(`docs/reports/${file}`, "utf8");
  const data = JSON.parse(html.match(new RegExp(`<script id="${tag}" type="application/json">([\\s\\S]*?)</script>`))[1]);
  inject(data);
  const nodes = new Map();
  const getNode = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: "", innerHTML: "", scrollTo() {}, setAttribute() {}, addEventListener() {}, classList: { toggle() {} } });
    return nodes.get(id);
  };
  getNode(tag).textContent = JSON.stringify(data);
  // DOM is the external boundary; execute the published report's complete script.
  runInNewContext(html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>")), {
    document: { getElementById: getNode, querySelectorAll: () => [] },
    window: {}, location: { hash: "" }, history: { replaceState() {} },
  }, { timeout: 3000 });
  const markup = [...nodes.values()].map(node => node.innerHTML).join("\n");
  assert.equal(/<img\s+data-report-injection/i.test(markup), false, `${file} interpreted metadata as HTML`);
  assert.equal(/"\s+data-report-injection=/i.test(markup), false, `${file} allowed metadata to create an attribute`);
  assert.equal(/&lt;img data-report-injection/i.test(markup), true, `${file} should preserve literal metadata text`);
  console.log(`PASS: ${file} renders metadata as literal text and keeps attribute values contained`);
}
