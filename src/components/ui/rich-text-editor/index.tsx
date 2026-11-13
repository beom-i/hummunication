"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { templateDocument, type RichDocument } from "./schemas";
import "./editor.css";

export function RichTextEditor({ value, onChange, onBlur, id, invalid }: {
  value: RichDocument; onChange: (value: RichDocument) => void; onBlur: () => void; id: string; invalid?: boolean;
}) {
  const content = useMemo(() => templateDocument(value), [value]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, code: false, codeBlock: false, horizontalRule: false, link: false })],
    content,
    editorProps: { attributes: { id, role: "textbox", "aria-label": "정리 내용", "aria-multiline": "true", "aria-placeholder": "설교 정리 내용을 입력하거나 붙여넣어 주세요", "aria-invalid": String(!!invalid), class: "rich-editor-content" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDocument),
    onBlur,
  });
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
  } : null });
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  return <div className="rich-editor overflow-hidden rounded-2xl border bg-muted text-foreground" data-empty={content.content.every(paragraph => !paragraph.content?.length)} data-invalid={invalid || undefined}>
    <div className="flex flex-wrap items-center gap-1 border-b bg-card p-2" role="toolbar" aria-label="정리 내용 서식">
      {([{ mark: "bold", label: "굵게", Icon: Bold, action: () => editor?.chain().focus().toggleBold().run() },
        { mark: "italic", label: "기울임", Icon: Italic, action: () => editor?.chain().focus().toggleItalic().run() },
        { mark: "underline", label: "밑줄", Icon: Underline, action: () => editor?.chain().focus().toggleUnderline().run() },
        { mark: "strike", label: "취소선", Icon: Strikethrough, action: () => editor?.chain().focus().toggleStrike().run() }] as const).map(({ mark, label, Icon, action }) => <Button key={mark} type="button" variant={state?.[mark] ? "secondary" : "ghost"} size="icon-sm" aria-label={label} aria-pressed={!!state?.[mark]} disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={action}><Icon className="size-4" /></Button>)}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
