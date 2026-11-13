import { z } from "zod";

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "#RRGGBB 형식으로 입력해 주세요").transform(value => value.toUpperCase());
export const storedColorSchema = z.string().transform((value, ctx) => {
  const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(value);
  if (rgb && rgb.slice(1).every(n => Number(n) <= 255)) return `#${rgb.slice(1).map(n => Number(n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  const parsed = hexColorSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  ctx.addIssue({ code: "custom", message: "글자 색상을 확인해 주세요" });
  return z.NEVER;
});
const markSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["bold", "italic", "underline", "strike"]) }).strict(),
  z.object({ type: z.literal("textStyle"), attrs: z.object({
    color: storedColorSchema.nullish(),
    fontSize: z.string().regex(/^(?:[89]|[12]\d|3[0-2])px$/, "글자 크기는 8~32px로 설정해 주세요").nullish(),
  }).strict() }).strict(),
]);
const inlineSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1), marks: z.array(markSchema).max(5).optional() }).strict(),
  z.object({ type: z.literal("hardBreak") }).strict(),
]);
export const richDocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.object({ type: z.literal("paragraph"), content: z.array(inlineSchema).optional() }).strict()).min(1).max(2000),
}).strict().refine(doc => documentText(doc).length <= 20000, "20,000자 이내로 입력해 주세요");
export type RichDocument = z.infer<typeof richDocumentSchema>;

export function documentFromText(text: string): RichDocument {
  return { type: "doc", content: text.split("\n").map(line => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })) };
}
export function documentText(doc: { content: { content?: { type: string; text?: string }[] }[] }) {
  return doc.content.map(p => (p.content ?? []).map(n => n.type === "hardBreak" ? "\n" : n.text ?? "").join("")).join("\n");
}
// Accept validated legacy styles when reading, but use template typography everywhere.
export function templateDocument(doc: RichDocument): RichDocument {
  return { ...doc, content: doc.content.map(paragraph => ({ ...paragraph, content: paragraph.content?.map(node => node.type === "text" ? { ...node, marks: node.marks?.filter(mark => mark.type !== "textStyle") } : node) })) };
}
