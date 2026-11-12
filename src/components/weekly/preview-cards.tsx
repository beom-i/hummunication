"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect, useRef } from "react";
import { useSermonPages } from "./sermon-pagination";
import { CroppedPhoto } from "./photo-crop";
import { newFamily, type WeeklyFormData } from "./schemas";

const asset = "/images/weekly/";
export function familyPageCount(group: WeeklyFormData["families"][number]) {
  return Math.max(4, 2 + Math.ceil((group.members.length + 1) / 3));
}

function textLines(text: string, width = 42) {
  const lines: string[] = [];
  let line = "";
  let size = 0;
  for (const character of text) {
    const weight = /[\u0000-\u00ff]/.test(character) ? 0.55 : 1;
    if (character === "\n" || size + weight > width) { lines.push(line); line = ""; size = 0; }
    if (character !== "\n") { line += character; size += weight; }
  }
  if (line) lines.push(line);
  return lines;
}

function CardFrame({ children, label, family = false }: { children: React.ReactNode; label: string; family?: boolean }) {
  return <div className={`news-card ${family ? "family-card" : "sermon-card"}`}><svg viewBox="0 0 300 375" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg"><rect width="300" height="375" fill={family ? "var(--family-paper)" : "var(--sermon-paper)"} />{children}</svg></div>;
}

export function SermonCard({ index }: { index: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const sermon = useWatch({ control, name: "sermon" });
  const thumbnail = useWatch({ control, name: "sermonThumbnail" });
  const { pages } = useSermonPages();
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => node.style.setProperty("--sermon-scale", String(entry.contentRect.width / 480)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [index]);
  if (index > 0) return <div ref={frame} className="news-card sermon-html-card" role="img" aria-label={`설교 정리 ${index + 1}페이지`}>
    <div className="sermon-sheet" data-export-html>
      <div className="sermon-sheet-header">십자가를 지고 나를 따르라</div>
      <div className="sermon-sheet-body sermon-rich-text" dangerouslySetInnerHTML={{ __html: pages[index - 1] ?? "" }} />
      <div className="sermon-sheet-footer">HUB COMMUNITY</div>
    </div>
  </div>;
  return <CardFrame label={`설교 정리 ${index === 0 ? "표지" : `${index + 1}페이지`}`}>
    <rect width="300" height="64.575" fill="var(--sermon-red)" />
    <image href="/images/templates/8468a.svg" x="122.29" y="11.49" width="56.431" height="42.426" />
    <image href="/images/templates/34130.svg" x="98.77" y="29.91" width="3.838" height="3.838" />
    <image href="/images/templates/34130.svg" x="198.4" y="29.91" width="3.838" height="3.838" />
    <rect x="0" y="89" width="300" height="232" fill="var(--art-white)" />
    <text x="150" y="123" textAnchor="middle" fill="var(--art-ink)" fontSize="12" fontWeight="600">{sermon.date.replaceAll("-", ".")} HUB 주일 예배 | {sermon.speaker}</text>
    <image href={thumbnail || "/images/templates/690bd.png"} x="38" y="142" width="221" height="124.2" preserveAspectRatio="xMidYMid slice" />
    <text x="150" y="293" textAnchor="middle" fill="var(--art-copy)" fontSize="9.8">{textLines(sermon.title, 32).slice(0, 2).map((line, i) => <tspan key={i} x="150" dy={i ? 13.8 : 0}>{line}</tspan>)}</text>
    <text x="150" y="307" textAnchor="middle" fill="var(--art-copy)" fontSize="9.8">({sermon.bible})</text>
    <rect y="356" width="300" height="19" fill="var(--sermon-red)" />
    <image href="/images/templates/db00a.svg" x="109.57" y="362.18" width="77.236" height="5.903" />
  </CardFrame>;
}

export function FamilyCard({ index, groupIndex = 0 }: { index: number; groupIndex?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const group = useWatch({ control, name: `families.${groupIndex}` }) ?? newFamily(0);
  const people = [{ name: group.leader_name, answer: group.leader_answer }, ...group.members];
  const visiblePeople = people.slice((index - 2) * 3, (index - 1) * 3);
  return <CardFrame family label={`새가족 문답 ${index === 0 ? "표지" : `${index + 1}페이지`}`}>
    {index === 0 ? <>
      <image href="/images/templates/family-cover.png" width="300" height="375" />    </> : index === 1 ? <>
      <text x="150" y="55" textAnchor="middle" fill="var(--family-green)" fontSize="28.8" fontFamily="Georgia, serif" fontWeight="bold">NEW FAMILY</text>
      <image href={`${asset}f5cdb.svg`} x="24" y="73" width="252" height="85.5" /><text x="150" y="148" textAnchor="middle" fill="var(--art-white)" fontSize="9.6" fontWeight="bold">({group.name})</text>
      <rect x="24" y="158.5" width="252" height="156" fill="var(--family-brown)" /><rect x="31" y="165" width="238" height="142" fill="var(--family-photo)" />
      {group.photo ? <CroppedPhoto source={group.photo} edit={group.photo_edit} x={31} y={165} width={238} height={142} label="순 단체사진" /> : <text x="150" y="292" textAnchor="middle" fill="var(--art-white)" fontSize="6" opacity="0.5">순 단체사진</text>}
      <path d="M24 322H276" stroke="var(--family-brown)" strokeWidth="1.2" /><text x="150" y="339" textAnchor="middle" fill="var(--family-brown)" fontSize="8" fontWeight="bold">{people.map((person) => person.name).join(" | ")}</text>
    </> : <>
      <image href={`${asset}94075.svg`} x="129" y="18" width="42" height="14.25" /><text x="150" y="54" textAnchor="middle" fill="var(--family-brown)" fontSize="13.8" fontFamily="serif" fontWeight="bold">( 허브 ) 가 좋은 이유 ?</text>
      <path d="M24 64H276" stroke="var(--family-brown)" strokeWidth="1.2" />
      {visiblePeople.map((person, i) => <g key={i} transform={`translate(24 ${86 + i * 84})`}><text fill="var(--family-brown)" fontSize="8.7" fontWeight="bold" y="9">{person.name}</text>{person.answer ? <text fill="var(--family-copy)" fontSize="8.1" x="45" y="9">{textLines(person.answer, 22).slice(0, 4).map((line, j) => <tspan key={j} x="45" dy={j ? 14.175 : 0}>{line}</tspan>)}</text> : <g fill="var(--family-skeleton)"><rect x="45" y="4" width="207" height="4.5" rx="2.25" /><rect x="45" y="14" width="207" height="4.5" rx="2.25" /><rect x="45" y="24" width="124" height="4.5" rx="2.25" /></g>}</g>)}
    </>}
    {index > 0 && <text x="150" y="367" textAnchor="middle" fill="var(--family-footer)" fontSize="6" letterSpacing="0.72">@ 2026 HUB</text>}
  </CardFrame>;
}

export function BulletinCard({ cover = false, artwork = false }: { cover?: boolean; artwork?: boolean }) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  const month = Number(date.slice(5, 7));
  const week = ["첫째", "둘째", "셋째", "넷째", "다섯째"][Math.floor((Number(date.slice(-2)) - 1) / 7)];
  return <CardFrame label={cover ? "주보 표지" : "주보 썸네일"}>
    {artwork ? <image href="/images/templates/bulletin-thumbnail.png" x="-111" width="522" height="375" preserveAspectRatio="xMidYMid slice" /> : cover ? <>
      <image href="/images/templates/bulletin-cover.png" width="300" height="375" />
      <rect x="65" y="313" width="170" height="30" fill="var(--cover-paper)" />
      <text x="150" y="334" textAnchor="middle" fill="var(--sermon-red)" fontSize="16.67" fontFamily="serif" fontWeight="bold">{month}월 {week}주 주보</text>
    </> : <>
      <rect width="300" height="375" fill="var(--thumbnail-paper)" />
      <image href="/images/templates/bulletin-thumbnail.png" x="0" y="80" width="300" height="215.3" />
      <rect x="90" y="247" width="120" height="21" rx="11" fill="var(--art-ink)" />
      <text x="150" y="261" textAnchor="middle" fill="var(--art-white)" fontSize="8">· {month}월 {week}주 주보 ·</text>
    </>}
  </CardFrame>;
}
