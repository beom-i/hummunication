"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { WeeklyFormData } from "./schemas";

const asset = "/images/weekly/";
export function familyPageCount(group: WeeklyFormData["groups"][number]) {
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
  // shortcut: the mock uses seven fixed pages; replace this with generated pagination when the content API is connected.
  const paragraphs = sermon.content.split(/\n\s*\n/).filter(Boolean);
  const text = paragraphs[(index - 1) % Math.max(1, paragraphs.length)] ?? sermon.content;
  return <CardFrame label={`설교 정리 ${index === 0 ? "표지" : `${index + 1}페이지`}`}>
    <rect width="300" height={index === 0 ? 64 : 40} fill="var(--sermon-red)" />
    {index === 0 ? <>
      <text x="150" y="29" textAnchor="middle" fill="var(--art-white)" fontFamily="Georgia, serif" fontWeight="bold" fontSize="21">FOLLOW</text>
      <rect x="128" y="36" width="44" height="16" rx="8" fill="var(--art-ink)" /><text x="150" y="47" textAnchor="middle" fill="var(--art-white)" fontFamily="Georgia, serif" fontSize="9">JESUS</text>
      <text x="150" y="117" textAnchor="middle" fill="var(--art-ink)" fontSize="8" fontWeight="bold">{sermon.date.replaceAll("-", ".")} 허브 예배 | {sermon.speaker}</text>
      <rect x="24" y="135" width="252" height="143" fill="var(--sermon-title)" />
      <text x="150" y="173" textAnchor="middle" fill="var(--art-white)" fontSize="6" letterSpacing="1.2">HUB COMMUNITY</text>
      <text x="150" y="203" textAnchor="middle" fill="var(--art-white)" fontFamily="Georgia, serif" fontSize="18">{textLines(sermon.title, 13).slice(0, 3).map((line, i) => <tspan key={i} x="150" dy={i ? 23 : 0}>{line}</tspan>)}</text>
      <text x="150" y="302" textAnchor="middle" fill="var(--art-copy)" fontSize="7">{sermon.passage}</text><text x="150" y="317" textAnchor="middle" fill="var(--art-copy)" fontSize="7">{sermon.speaker}</text>
    </> : <>
      <text x="150" y="25" textAnchor="middle" fill="var(--art-white)" fontFamily="Georgia, serif" fontSize="11">십자가를 지고 나를 따르라</text>
      <text x="24" y="68" fill="var(--art-copy)" fontSize="10" fontFamily="serif">{textLines(text, 25).slice(0, 19).map((line, i) => <tspan key={i} x="24" dy={i ? 16 : 0}>{line}</tspan>)}</text>
    </>}
    <rect y="356" width="300" height="19" fill="var(--sermon-red)" /><text x="150" y="368" textAnchor="middle" fill="var(--art-white)" fontSize="5" fontWeight="bold" letterSpacing="1">HUB COMMUNITY</text>
  </CardFrame>;
}

export function FamilyCard({ index, groupIndex = 0 }: { index: number; groupIndex?: number }) {
  const { control } = useFormContext<WeeklyFormData>();
  const group = useWatch({ control, name: `groups.${groupIndex}` });
  const people = [group.leader, ...group.members];
  const visiblePeople = people.slice((index - 2) * 3, (index - 1) * 3);
  return <CardFrame family label={`새가족 문답 ${index === 0 ? "표지" : `${index + 1}페이지`}`}>
    {index === 0 ? <>
      <text x="60" y="40" fill="var(--family-brown)" fontSize="10.5" fontFamily="serif">(26)</text>
      <image href={`${asset}71f08.svg`} x="12" y="48" width="276" height="111" />
      <text x="150" y="147" textAnchor="middle" fill="var(--art-white)" fontSize="7.5" letterSpacing="3">N E W　F A M I L Y</text>
      <text x="18" y="201" fill="var(--family-green)" fontSize="33" fontFamily="Georgia, serif" fontWeight="bold"><tspan x="18">WELCOME !</tspan><tspan x="18" dy="35.64">HUB</tspan></text>
      <path d="M18 348H282" stroke="var(--family-brown)" strokeWidth="0.9" />
    </> : index === 1 ? <>
      <text x="150" y="55" textAnchor="middle" fill="var(--family-green)" fontSize="28.8" fontFamily="Georgia, serif" fontWeight="bold">NEW FAMILY</text>
      <image href={`${asset}f5cdb.svg`} x="24" y="73" width="252" height="85.5" /><text x="150" y="148" textAnchor="middle" fill="var(--art-white)" fontSize="9.6" fontWeight="bold">({group.name})</text>
      <rect x="24" y="158.5" width="252" height="156" fill="var(--family-brown)" /><rect x="31" y="165" width="238" height="142" fill="var(--family-photo)" />
      {group.photo ? <image href={group.photo} x="31" y="165" width="238" height="142" preserveAspectRatio="xMidYMid slice" /> : <text x="150" y="292" textAnchor="middle" fill="var(--art-white)" fontSize="6" opacity="0.5">순 단체사진</text>}
      <path d="M24 322H276" stroke="var(--family-brown)" strokeWidth="1.2" /><text x="150" y="339" textAnchor="middle" fill="var(--family-brown)" fontSize="8" fontWeight="bold">{people.map((person) => person.name).join(" | ")}</text>
    </> : <>
      <image href={`${asset}94075.svg`} x="129" y="18" width="42" height="14.25" /><text x="150" y="54" textAnchor="middle" fill="var(--family-brown)" fontSize="13.8" fontFamily="serif" fontWeight="bold">( 허브 ) 가 좋은 이유 ?</text>
      <path d="M24 64H276" stroke="var(--family-brown)" strokeWidth="1.2" />
      {visiblePeople.map((person, i) => <g key={i} transform={`translate(24 ${86 + i * 84})`}><text fill="var(--family-brown)" fontSize="8.7" fontWeight="bold" y="9">{person.name}</text>{person.answer ? <text fill="var(--family-copy)" fontSize="8.1" x="45" y="9">{textLines(person.answer, 22).slice(0, 4).map((line, j) => <tspan key={j} x="45" dy={j ? 14.175 : 0}>{line}</tspan>)}</text> : <g fill="var(--family-skeleton)"><rect x="45" y="4" width="207" height="4.5" rx="2.25" /><rect x="45" y="14" width="207" height="4.5" rx="2.25" /><rect x="45" y="24" width="124" height="4.5" rx="2.25" /></g>}</g>)}
    </>}
    <text x="150" y="367" textAnchor="middle" fill="var(--family-footer)" fontSize="6" letterSpacing="0.72">HUB NEW FAMILY</text>
  </CardFrame>;
}

export function BulletinCard({ cover = false }: { cover?: boolean }) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  const week = ["첫째", "둘째", "셋째", "넷째", "다섯째"][Math.floor((Number(date.slice(-2)) - 1) / 7)];
  return <CardFrame label={cover ? "주보 표지" : "주보 썸네일"}>
    {!cover ? <>
      <rect width="300" height="375" fill="var(--thumbnail-paper)" /><rect x="15" y="85" width="270" height="193" fill="var(--sermon-red)" />
      <image href={`${asset}6cc93.svg`} x="145.52" y="108" width="8.96" height="13.513" /><text x="150" y="170" textAnchor="middle" fill="var(--art-white)" fontSize="25" fontWeight="bold"><tspan x="150">온누리교회</tspan><tspan x="150" dy="31">허브대학부</tspan></text>
      <rect x="90" y="220" width="120" height="22" rx="11" fill="var(--art-ink)" /><text x="150" y="234" textAnchor="middle" fill="var(--art-white)" fontSize="8">· 11월 {week}주 주보 ·</text>
    </> : <>
      <rect width="300" height="375" fill="var(--cover-paper)" /><rect width="300" height="24" fill="var(--sermon-red)" /><text x="150" y="15" textAnchor="middle" fill="var(--art-white)" fontSize="6">+ 십자가를 지고 나를 따르라</text>
      <text x="150" y="71" textAnchor="middle" fill="var(--sermon-red)" fontFamily="serif" fontWeight="bold" fontSize="14">온누리교회 허브대학부</text>
      <path d="M60 292V178A90 90 0 0 1 240 178V292Z" fill="var(--sermon-red)" /><text x="150" y="133" textAnchor="middle" fill="var(--art-white)" fontFamily="Georgia, serif" fontSize="24"><tspan x="150">FOLLOW</tspan><tspan x="150" dy="26">JESUS</tspan></text>
      <image href={`${asset}677c8.svg`} x="137.625" y="186" width="24.75" height="37.326" /><image href={`${asset}e00b8.svg`} x="115" y="242" width="70" height="70" />
      <text x="150" y="343" textAnchor="middle" fill="var(--sermon-red)" fontSize="13" fontFamily="serif" fontWeight="bold">11월 {week}주 주보</text><rect y="361" width="300" height="14" fill="var(--sermon-red)" />
    </>}
  </CardFrame>;
}
