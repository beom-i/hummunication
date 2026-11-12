"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { cardLabelSize, paginateCardRows, type CardTextRow } from "./card-pagination";
import type { WeeklyFormData } from "./schemas";
import "./template-cards.css";

type Pages = { families: CardTextRow[][][]; senders: CardTextRow[][][]; ready: boolean };
const CardPages = createContext<Pages>({ families: [], senders: [], ready: false });
export function CardPagesProvider({ children }: { children: React.ReactNode }) {
  const { control } = useFormContext<WeeklyFormData>();
  const families = useWatch({ control, name: "families" });
  const senders = useWatch({ control, name: "senders" });
  const [result, setResult] = useState<{ source: { families: typeof families; senders: typeof senders }; pages: Omit<Pages, "ready"> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const host = document.querySelector(".weekly-main") ?? document.body;
      const measure = document.createElement("div");
      measure.className = "template-text-measure family-card-answers";
      host.append(measure);
      try {
        const font = getComputedStyle(measure).fontFamily;
        await Promise.all([400, 500, 700].map(weight => document.fonts.load(`${weight} 22px ${font}`)));
        if (cancelled) return;
        const familyPages = families.map(group => paginateCardRows([{ label: group.leader_name, text: group.leader_answer }, ...group.members.map(person => ({ label: person.name, text: person.answer }))], measure, 535));
        measure.className = "template-text-measure sender-card-prayers";
        const senderPages = (senders ?? []).map(sender => paginateCardRows(sender.prayer.split(/\n+/).filter(line => line.trim()).map((text, i) => ({ label: String(i + 1), text })), measure, 340));
        setResult({ source: { families, senders }, pages: { families: familyPages, senders: senderPages } });
      } finally { measure.remove(); }
    }, 80);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [families, senders]);
  return <CardPages.Provider value={{ families: result?.pages.families ?? [], senders: result?.pages.senders ?? [], ready: result?.source.families === families && result?.source.senders === senders }}>{children}</CardPages.Provider>;
}
export const useCardPages = () => useContext(CardPages);

export function CardTextRows({ rows }: { rows: CardTextRow[] }) {
  return rows.map((row, index) => <div className="card-text-row" key={index}><span style={{ fontSize: cardLabelSize(row.label) }}>{row.label}</span><p>{row.text}</p></div>);
}
