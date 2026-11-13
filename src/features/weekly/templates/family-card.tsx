"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";
import { TemplateAsset, TemplateFrame } from "./template-frame";
import { newFamily } from "../schemas";
import { CroppedPhoto } from "@/features/files/components/photo-crop";
import { CardTextRows, useCardPages } from "./card-pages";

export function FamilyCard({ index, groupIndex = 0 }: { index: number; groupIndex?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const group = useWatch({ control, name: `families.${groupIndex}` }) ?? newFamily(0);
  const date = useWatch({ control, name: "date" });
  const { families } = useCardPages();
  const people = [{ name: group.leader_name }, ...group.members];
  let variant = "family-answer-card";
  let content = <>
      <TemplateAsset name="e5d42.svg" x={149.27} y={78} width={150.398} height={57} />
      <TemplateAsset name="family-question-heading.svg" x={156.60205078125} y={147.0341796875} width={412} height={52} />
      <TemplateAsset name="3bdbb.svg" x={1} y={224} width={720} height={2} />
      <div className="family-card-answers"><CardTextRows rows={families[groupIndex]?.[index - 2] ?? []} /></div>
    </>;
  if (index === 0) {
    variant = "family-cover-card";
    content = <>
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
    </>;
  } else if (index === 1) {
    variant = "family-photo-card";
    content = <>
      <TemplateAsset name="family-photo-heading.svg" x={32.39794921875} y={32.869991302490234} width={656} height={87} />
      <TemplateAsset name="6f2c6.svg" x={51.863} y={186} width={615.19} height={232} />
      <p className="family-photo-group" data-fit-width data-fit-text>( {group.name} )</p>
      <svg className="family-photo-image" width="588" height="331" viewBox="0 0 588 331">{group.photo && <CroppedPhoto source={group.photo} edit={group.photo_edit} aspect={16 / 9} width={588} height={331} label="순 단체사진" />}</svg>
      <TemplateAsset name="3bdbb.svg" x={0} y={740} width={720} height={2} />
      <p className="family-photo-names" data-fit-height="60" data-fit-text>{people.map(person => person.name).filter(Boolean).join(" ㅣ ")}</p>
    </>;
  }
  return <TemplateFrame label={`새가족 문답 ${index === 0 ? "표지" : `${index + 1}페이지`}`} className={`family-card ${variant}`}>
    {content}
    {index > 0 && <p className="family-card-footer"><span>@ </span>{date.slice(0, 4)} HUG</p>}
  </TemplateFrame>;
}
