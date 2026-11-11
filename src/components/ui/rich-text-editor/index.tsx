"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { colorPresets, fontSizes, richToolbarSchema, richToolbarDefaults, storedColorSchema, type RichToolbarData, type RichDocument } from "./schemas";
import "./editor.css";

export function RichTextEditor({ value, onChange, onBlur, id, invalid }: {
  value: RichDocument; onChange: (value: RichDocument) => void; onBlur: () => void; id: string; invalid?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, code: false, codeBlock: false, horizontalRule: false, link: false }), TextStyle, Color, FontSize],
    content: value,
    editorProps: { attributes: { id, role: "textbox", "aria-label": "정리 내용", "aria-multiline": "true", "aria-invalid": String(!!invalid), class: "rich-editor-content" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDocument),
    onBlur,
  });
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
    color: editor.getAttributes("textStyle").color as string | undefined,
    fontSize: (editor.getAttributes("textStyle").fontSize as string | undefined)?.replace("px", "") ?? "16",
  } : null });
  const { control, register, setValue, handleSubmit, formState: { errors } } = useForm<RichToolbarData>({ resolver: zodResolver(richToolbarSchema), defaultValues: richToolbarDefaults });
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    const color = storedColorSchema.safeParse(state?.color);
    setValue("color", color.success ? color.data : colorPresets[0]);
    setValue("fontSize", state?.fontSize ?? "16");
  }, [state?.color, state?.fontSize, setValue]);
  const applyColor = handleSubmit(data => editor?.chain().focus().setColor(data.color).run());

  return <div className="rich-editor overflow-hidden rounded-2xl border bg-muted" data-invalid={invalid || undefined}>
    <div className="flex flex-wrap items-center gap-1 border-b bg-card p-2" role="toolbar" aria-label="정리 내용 서식">
      {([{ mark: "bold", label: "굵게", Icon: Bold, action: () => editor?.chain().focus().toggleBold().run() },
        { mark: "italic", label: "기울임", Icon: Italic, action: () => editor?.chain().focus().toggleItalic().run() },
        { mark: "underline", label: "밑줄", Icon: Underline, action: () => editor?.chain().focus().toggleUnderline().run() },
        { mark: "strike", label: "취소선", Icon: Strikethrough, action: () => editor?.chain().focus().toggleStrike().run() }] as const).map(({ mark, label, Icon, action }) => <Button key={mark} type="button" variant={state?.[mark] ? "secondary" : "ghost"} size="icon-sm" aria-label={label} aria-pressed={!!state?.[mark]} disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={action}><Icon className="size-4" /></Button>)}
      <Controller control={control} name="fontSize" render={({ field }) => <Select value={field.value} onValueChange={size => { field.onChange(size); editor?.chain().focus().setFontSize(`${size}px`).run(); }} disabled={!editor}><SelectTrigger aria-label="글자 크기" className="ml-1 h-8 w-[78px] text-xs"><SelectValue>{field.value}px</SelectValue></SelectTrigger><SelectContent className="weekly-popover">{fontSizes.map(size => <SelectItem key={size} value={String(size)}>{size}px</SelectItem>)}</SelectContent></Select>} />
    </div>
    <div className="flex flex-wrap items-center gap-1 border-b bg-card px-3 py-2" role="group" aria-label="글자 색상">
      <div className="grid w-full grid-cols-10">{colorPresets.map(color => <button key={color} type="button" aria-label={`글자 색상 ${color}`} title={color} onMouseDown={e => e.preventDefault()} onClick={() => { setValue("color", color, { shouldValidate: true }); editor?.chain().focus().setColor(color).run(); }} className="flex h-7 items-center justify-center rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"><span className="size-4 rounded-full border border-border" style={{ backgroundColor: color }} /></button>)}</div>
      <Input aria-label="HEX 글자 색상" placeholder="#RRGGBB" className="h-7 w-[94px] bg-card px-2 text-xs" {...register("color")} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void applyColor(); } }} aria-invalid={!!errors.color} />
      <Button type="button" variant="ghost" size="xs" onClick={() => void applyColor()}>적용</Button>
      {errors.color && <p role="alert" className="w-full text-xs text-destructive">{errors.color.message}</p>}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
