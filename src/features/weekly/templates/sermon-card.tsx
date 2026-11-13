"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";
import { TemplateAsset, TemplateFrame } from "./template-frame";
import { useSermonPages } from "./sermon-pages";
import { CroppedPhoto } from "@/features/files/components/photo-crop";

export function SermonCard({ index }: { index: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const sermon = useWatch({ control, name: "sermon" });
  const thumbnail = useWatch({ control, name: "sermonThumbnail" });
  const { pages } = useSermonPages();
  return <TemplateFrame label={`설교 정리 ${index === 0 ? "표지" : `${index + 1}페이지`}`} className={index ? "sermon-html-card" : "sermon-cover-card"}>
    {index > 0 ? <>
      <div className="sermon-sheet-header"><TemplateAsset name="f874e.svg" x={228} y={38} width={267} height={24} /></div>
      <div className={`sermon-sheet-body sermon-rich-text${index === 1 || index === 4 ? " sermon-offset-body" : ""}`} dangerouslySetInnerHTML={{ __html: pages[index - 1] ?? "" }} />
    </> : <>
      <div className="sermon-cover-header"><TemplateAsset name="eacaf.svg" x={296.89} y={27.88} width={137} height={103} /><TemplateAsset name="ae05e.svg" x={239.79} y={72.61} width={9.318} height={9.318} nativeWidth={9.31799} nativeHeight={9.31799} /><TemplateAsset name="ae05e.svg" x={481.67} y={72.61} width={9.318} height={9.318} nativeWidth={9.31799} nativeHeight={9.31799} /></div>
      <div className="sermon-cover-content" data-fit-height="675">
        <p className="sermon-cover-meta" data-fit-text>{sermon.date.replaceAll("-", ".")} HUB 주일 예배{sermon.speaker && <> | {sermon.speaker}</>}</p>
        <svg width="536" height="301" viewBox="0 0 536 301">{thumbnail && <CroppedPhoto source={thumbnail} edit={sermon.thumbnailEdit} aspect={16 / 9} width={536} height={301} label="설교 썸네일" />}</svg>
        <p className="sermon-cover-title" data-fit-text>{sermon.title}{sermon.bible && <><br />({sermon.bible})</>}</p>
      </div>
    </>}
    <div className="sermon-sheet-footer"><TemplateAsset name={index > 0 ? "79109.svg" : "22e8a.svg"} x={266} y={15} width={187.51} height={14.33} /></div>
  </TemplateFrame>;
}
