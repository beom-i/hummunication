"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";
import { TemplateAsset, TemplateFrame } from "./template-frame";
import { bulletinTitle } from "@/features/bulletins/utils/format";

export function BulletinCard(props: { cover?: boolean; artwork?: boolean }) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  return <BulletinTemplate date={date} {...props} />;
}

export function BulletinTemplate({ date, cover = false, artwork = false }: { date: string; cover?: boolean; artwork?: boolean }) {
  return <TemplateFrame label={cover ? "주보 표지" : "주보 썸네일"} height={cover || artwork ? 900 : 514} className={`bulletin-card ${cover ? "bulletin-cover-card" : "bulletin-thumbnail-card"} ${artwork ? "bulletin-artwork" : ""}`}>
    <TemplateAsset name={cover ? "bulletin-cover-art.png" : "bulletin-thumbnail-art.png"} x={0} y={0} width={720} height={cover ? 900 : 514} />
    <p className="bulletin-church">{cover ? "온누리교회 허브대학부" : <>온누리교회<br />허브대학부</>}</p>
    <p className="bulletin-date">{bulletinTitle(date)}</p>
  </TemplateFrame>;
}
