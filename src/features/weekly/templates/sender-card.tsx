"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";
import { TemplateAsset, TemplateFrame } from "./template-frame";
import { CardTextRows, useCardPages } from "./card-pages";

export function SenderCard({ index, page = 0 }: { index: number; page?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const sender = useWatch({ control, name: `senders.${index}` });
  const { senders } = useCardPages();
  return <TemplateFrame label="파송자 카드뉴스" className="sender-card">
    <TemplateAsset name="sender-art.png" x={0} y={0} width={720} height={900} />
    <p className="sender-card-name" data-fit-width data-fit-text>{sender?.generation && `${sender.generation}기 `}{sender?.name}</p>
    <div className="sender-card-prayers"><CardTextRows rows={senders[index]?.[page] ?? []} /></div>
  </TemplateFrame>;
}
