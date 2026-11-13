"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { richDocumentSchema, type RichDocument } from "@/components/ui/rich-text-editor/schemas";
import type { WeeklyFormData } from "@/features/weekly/schemas";
import { paginateSermon } from "../utils/sermon-pagination";
import "./sermon-cards.css";

const SermonPages = createContext<{ pages: string[]; ready: boolean }>({ pages: [""], ready: false });
export function SermonPagesProvider({ children }: { children: React.ReactNode }) {
  const { control } = useFormContext<WeeklyFormData>();
  const doc = useWatch({ control, name: "sermon.content" });
  const [result, setResult] = useState<{ doc: RichDocument; pages: string[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      await document.fonts.ready;
      if (cancelled) return;
      const measure = document.createElement("div");
      measure.className = "sermon-rich-text sermon-measure";
      const host = document.querySelector(".weekly-main") ?? document.body;
      host.append(measure);
      try {
        await document.fonts.load(getComputedStyle(measure).font).catch(() => {});
        if (cancelled) return;
        const parsed = richDocumentSchema.safeParse(doc);
        if (parsed.success) setResult({ doc, pages: paginateSermon(parsed.data, measure) });
      } finally { measure.remove(); }
    }, 80);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [doc]);
  return <SermonPages.Provider value={{ pages: result?.pages ?? [""], ready: result?.doc === doc }}>{children}</SermonPages.Provider>;
}
export const useSermonPages = () => useContext(SermonPages);
