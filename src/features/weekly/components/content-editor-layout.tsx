import type { ReactNode } from "react";

type Props = { children: ReactNode; preview: ReactNode };

export function ContentEditorLayout({ children, preview }: Props) {
  return <div className="weekly-sermon-layout weekly-editor-layout mt-[60px] flex items-start gap-8">
    <div className="weekly-editor-form w-[380px] shrink-0">{children}</div>
    {preview}
  </div>;
}
