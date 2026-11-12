import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const payload = '<img data-report-injection src="data:,">';
const screenHtml = readFileSync("docs/reports/weekly-screen-data-map.html", "utf8");
const screens = JSON.parse(screenHtml.match(/<script id="screen-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const sections = screens.find(screen => screen.id === "03-sections");
assert.equal(sections.annotations.length, 1, "All five section choices share weekly.sections");
assert.equal(sections.annotations[0].field, "weekly.sections");
assert.match(sections.annotations[0].selector, /section-senders/);
for (const [id, nodeId, field] of [
  ["18-family-card-edit", "284:9928", "family.leader_answer"],
  ["19-senders", "284:10663", "sender.position"],
  ["20-sender-edit", "284:10796", "sender.prayer"],
]) {
  const screen = screens.find(screen => screen.id === id);
  assert.ok(screen, `Missing mockup mapping: ${id}`);
  assert.equal(screen.audit.figma.nodeId, nodeId);
  assert.ok(screen.image.startsWith("data:image/png;base64,"));
  assert.ok(screen.annotations.some(annotation => annotation.field.includes(field)), `Missing DB field: ${field}`);
}
console.log("PASS: shared section selection and all three linked mockups are mapped");
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
    window: { addEventListener() {} }, location: { hash: "" }, history: { replaceState() {} },
  }, { timeout: 3000 });
  const markup = [...nodes.values()].map(node => node.innerHTML).join("\n");
  assert.equal(/<img\s+data-report-injection/i.test(markup), false, `${file} interpreted metadata as HTML`);
  assert.equal(/"\s+data-report-injection=/i.test(markup), false, `${file} allowed metadata to create an attribute`);
  assert.equal(/&lt;img data-report-injection/i.test(markup), true, `${file} should preserve literal metadata text`);
  console.log(`PASS: ${file} renders metadata as literal text and keeps attribute values contained`);
}
