import { richDocumentSchema, templateDocument, type RichDocument } from "@/components/ui/rich-text-editor/schemas";

type Inline = NonNullable<RichDocument["content"][number]["content"]>[number];
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
function paragraphHtml(nodes: Inline[]) {
  const html = nodes.map(node => {
    if (node.type === "hardBreak") return "<br>";
    let text = escape(node.text);
    for (const mark of node.marks ?? []) {
      if (mark.type === "textStyle") continue;
      const tag = { bold: "strong", italic: "em", underline: "u", strike: "s" }[mark.type];
      text = `<${tag}>${text}</${tag}>`;
    }
    return text;
  }).join("");
  const point = nodes.find(node => node.type === "text")?.text.match(/^#(\d+)[.\s]/);
  return `<p${point ? ` class="sermon-point${point[1] === "1" ? " sermon-point-first" : ""}"` : ""}>${html || "<br>"}</p>`;
}
function sliceInline(nodes: Inline[], start: number, end: number): Inline[] {
  let offset = 0;
  return nodes.flatMap<Inline>(node => {
    const chars = node.type === "text" ? Array.from(node.text) : ["\n"];
    const from = Math.max(0, start - offset), to = Math.min(chars.length, end - offset);
    offset += chars.length;
    if (to <= from) return [];
    return node.type === "text" ? [{ ...node, text: chars.slice(from, to).join("") }] : [node];
  });
}

// Measure the same HTML/CSS as the card; never truncate or repeat source content.
export function paginateSermon(value: unknown, measure: HTMLElement) {
  const doc = templateDocument(richDocumentSchema.parse(value));
  const pages: string[] = [];
  let current = "";
  const fits = (html: string) => { measure.innerHTML = html; return measure.getBoundingClientRect().height <= 714.01; };
  for (const [index, paragraph] of doc.content.entries()) {
    let nodes = paragraph.content ?? [];
    const text = nodes.map(node => node.type === "text" ? node.text : "").join("");
    const next = doc.content[index + 1];
    if (current && /^#\d+[.\s]/.test(text) && next && !fits(current + paragraphHtml(nodes) + paragraphHtml(next.content ?? []))) { pages.push(current); current = ""; }
    if (fits(current + paragraphHtml(nodes))) { current += paragraphHtml(nodes); continue; }
    const previousText = doc.content[index - 1]?.content?.map(node => node.type === "text" ? node.text : "").join("") ?? "";
    if (current && !/^#\d+[.\s]/.test(previousText) && fits(paragraphHtml(nodes))) { pages.push(current); current = paragraphHtml(nodes); continue; }
    let length = nodes.reduce((sum, n) => sum + (n.type === "text" ? Array.from(n.text).length : 1), 0);
    if (!length) { pages.push(current); current = paragraphHtml([]); continue; }
    while (length) {
      let low = 0, high = length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fits(current + paragraphHtml(sliceInline(nodes, 0, mid)))) low = mid;
        else high = mid - 1;
      }
      if (!low) {
        if (!current) throw new Error("한 줄의 높이를 확인해 주세요");
        pages.push(current); current = ""; continue;
      }
      current += paragraphHtml(sliceInline(nodes, 0, low));
      nodes = sliceInline(nodes, low, length);
      length -= low;
      if (length) { pages.push(current); current = ""; }
    }
  }
  if (current) pages.push(current);
  return pages.length ? pages : ["<p><br></p>"];
}
