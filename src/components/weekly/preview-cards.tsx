"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useSermonPages } from "./sermon-pagination";
import { CroppedPhoto } from "./photo-crop";
import { newFamily, type WeeklyFormData } from "./schemas";
import { TemplateAsset, TemplateFrame } from "./template-frame";
import { CardTextRows, useCardPages } from "./card-pages";
import { bulletinTitle } from "@/components/bulletins/format";

export function SermonCard({ index }: { index: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const sermon = useWatch({ control, name: "sermon" });
  const thumbnail = useWatch({ control, name: "sermonThumbnail" });
  const { pages } = useSermonPages();
  return <TemplateFrame label={`설교 정리 ${index === 0 ? "표지" : `${index + 1}페이지`}`} className={index ? "sermon-html-card" : "sermon-cover-card"}>
    {index > 0 ? <>
      <div className="sermon-sheet-header"><TemplateAsset name="f874e.svg" x={228} y={38} width={267} height={24} /></div>
      <div className={`sermon-sheet-body sermon-rich-text${index === 1 ? " sermon-first-body" : ""}`} dangerouslySetInnerHTML={{ __html: pages[index - 1] ?? "" }} />
    </> : <>
      <div className="sermon-cover-header"><TemplateAsset name="eacaf.svg" x={296.89} y={27.88} width={137} height={103} /><TemplateAsset name="ae05e.svg" x={239.79} y={72.61} width={9.318} height={9.318} nativeWidth={9.31799} nativeHeight={9.31799} /><TemplateAsset name="ae05e.svg" x={481.67} y={72.61} width={9.318} height={9.318} nativeWidth={9.31799} nativeHeight={9.31799} /></div>
      <div className="sermon-cover-content" data-fit-height="675">
        <p className="sermon-cover-meta" data-fit-text>{sermon.date.replaceAll("-", ".")} HUB 주일 예배 | {sermon.speaker}</p>
        <svg width="536" height="301" viewBox="0 0 536 301"><CroppedPhoto source={thumbnail || "/images/templates/690bd.png"} edit={sermon.thumbnailEdit} aspect={16 / 9} width={536} height={301} label="설교 썸네일" /></svg>
        <p className="sermon-cover-title" data-fit-text>{sermon.title}<br />({sermon.bible})</p>
      </div>
    </>}
    <div className="sermon-sheet-footer"><TemplateAsset name="79109.svg" x={266} y={15} width={187.51} height={14.33} /></div>
  </TemplateFrame>;
}

export function FamilyCard({ index, groupIndex = 0 }: { index: number; groupIndex?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const group = useWatch({ control, name: `families.${groupIndex}` }) ?? newFamily(0);
  const date = useWatch({ control, name: "date" });
  const { families } = useCardPages();
  const people = [{ name: group.leader_name }, ...group.members];
  return <TemplateFrame label={`새가족 문답 ${index === 0 ? "표지" : `${index + 1}페이지`}`} className={`family-card ${index === 0 ? "family-cover-card" : index === 1 ? "family-photo-card" : "family-answer-card"}`}>
    {index === 0 ? <>
      <TemplateAsset name="61046.svg" x={21.782} y={177} width={633.241} height={240} />
      <div className="family-cover-welcome">WELCOME !<br /> HUB</div><p className="family-cover-roof-label">NEW FAMILY</p><span className="family-cover-year">({date.slice(2, 4)})</span>
      <TemplateAsset name="a9e7b.png" x={-131} y={542} width={366} height={366} nativeWidth={638} nativeHeight={638} />
      <div className="family-cover-right-hand"><TemplateAsset name="a9e7b.png" x={0} y={0} width={366} height={366} nativeWidth={638} nativeHeight={638} /></div>
      <div className="family-cover-cup"><TemplateAsset name="8e0e3.png" x={0} y={0} width={118.233} height={118.233} nativeWidth={638} nativeHeight={638} /></div>
      <TemplateAsset name="e3ea7.png" x={257} y={41} width={122} height={122} nativeWidth={638} nativeHeight={638} />
      <div className="family-cover-grapes"><TemplateAsset name="b0471.png" x={0} y={0} width={133.049} height={133.049} nativeWidth={638} nativeHeight={638} /></div>
      <TemplateAsset name="aab60.png" x={214} y={743} width={123} height={123} nativeWidth={638} nativeHeight={638} />
      <div className="family-cover-jug"><TemplateAsset name="352e5.png" x={0} y={0} width={146} height={145} nativeWidth={638} nativeHeight={638} /></div>
      <div className="family-cover-fish"><TemplateAsset name="de09a.png" x={0} y={0} width={115.994} height={115.994} nativeWidth={638} nativeHeight={638} /></div>
      <TemplateAsset name="3bdbb.svg" x={0} y={867} width={720} height={2} />
    </> : index === 1 ? <>
      <h3 className="family-photo-title">NEW FAMILY</h3>
      <TemplateAsset name="6f2c6.svg" x={51.863} y={186} width={615.19} height={232} />
      <p className="family-photo-group" data-fit-width data-fit-text>( {group.name} )</p>
      <svg className="family-photo-image" width="588" height="331" viewBox="0 0 588 331">{group.photo && <CroppedPhoto source={group.photo} edit={group.photo_edit} aspect={16 / 9} width={588} height={331} label="순 단체사진" />}</svg>
      <TemplateAsset name="3bdbb.svg" x={0} y={740} width={720} height={2} />
      <p className="family-photo-names" data-fit-height="60" data-fit-text>{people.map(person => person.name).filter(Boolean).join(" ㅣ ")}</p>
    </> : <>
      <TemplateAsset name="e5d42.svg" x={149.27} y={78} width={150.398} height={57} />
      <h3 className="family-question"><span className="family-question-parenthesis">(</span><strong> 허브 </strong><span className="family-question-parenthesis">)</span><span className="family-question-text">  가 좋은 이유 ? </span></h3>
      <TemplateAsset name="3bdbb.svg" x={1} y={224} width={720} height={2} />
      <div className="family-card-answers"><CardTextRows rows={families[groupIndex]?.[index - 2] ?? []} /></div>
    </>}
    {index > 0 && <p className="family-card-footer"><span>@ </span>{date.slice(0, 4)} HUG</p>}
  </TemplateFrame>;
}

export function BulletinCard({ cover = false, artwork = false }: { cover?: boolean; artwork?: boolean }) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  return <TemplateFrame label={cover ? "주보 표지" : "주보 썸네일"} height={cover || artwork ? 900 : 514} className={`bulletin-card ${cover ? "bulletin-cover-card" : "bulletin-thumbnail-card"} ${artwork ? "bulletin-artwork" : ""}`}>
    <TemplateAsset name={cover ? "bulletin-cover-art.png" : "bulletin-thumbnail-art.png"} x={0} y={0} width={720} height={cover ? 900 : 514} />
    <p className="bulletin-church">{cover ? "온누리교회 허브대학부" : <>온누리교회<br />허브대학부</>}</p>
    <p className="bulletin-date">{bulletinTitle(date)}</p>
  </TemplateFrame>;
}
