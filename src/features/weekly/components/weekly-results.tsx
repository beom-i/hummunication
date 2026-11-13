"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulletinCard } from "@/features/weekly/templates/bulletin-card";
import { FamilyCard } from "@/features/weekly/templates/family-card";
import { SermonCard } from "@/features/weekly/templates/sermon-card";
import { exportCards } from "@/features/weekly/utils/export-cards";
import type { WeeklyFormData } from "../schemas";
import { useSermonPages } from "@/features/weekly/templates/sermon-pages";
import { WeeklyStepSkeleton } from "./weekly-skeleton";
import { SenderCard } from "../templates/sender-card";
import { useCardPages } from "@/features/weekly/templates/card-pages";

type Artifact = { id: string; category: string; label: string; page: string; element: React.ReactNode };

export function WeeklyResults({ detail = false }: { detail?: boolean }) {
  const { control } = useFormContext<WeeklyFormData>();
  const date = useWatch({ control, name: "date" });
  const month = Number(date.slice(5, 7));
  const sections = useWatch({ control, name: "sections" });
  const families = useWatch({ control, name: "families" });
  const senders = useWatch({ control, name: "senders" });
  const { pages, ready } = useSermonPages();
  const cardPages = useCardPages();
  const preparing = (sections.includes("sermon") && !ready) || ((sections.includes("family") || sections.includes("senders")) && !cardPages.ready);
  const artifacts = useMemo(() => {
    const artifacts: Artifact[] = [];
    if (sections.includes("thumbnail")) artifacts.push({ id: "bulletin-thumbnail", category: "주보 썸네일", label: "주보 썸네일", page: `${month}월 주보`, element: <BulletinCard /> });
    if (sections.includes("cover")) artifacts.push({ id: "bulletin-cover", category: "주보 표지", label: "주보 표지", page: `${month}월 주보`, element: <BulletinCard cover /> });
    if (sections.includes("sermon")) for (let index = 0; index <= pages.length; index++) artifacts.push({ id: `sermon-${index + 1}`, category: "설교 정리", label: "설교 정리", page: `${index + 1}페이지`, element: <SermonCard index={index} /> });
    if (sections.includes("family") && families.length) artifacts.push({ id: "family-cover", category: "새가족 문답", label: "새가족 문답", page: "공통 표지", element: <FamilyCard index={0} /> });
    if (sections.includes("family")) families.forEach((group, groupIndex) => {
      for (let index = 1; index < 2 + (cardPages.families[groupIndex]?.length ?? 1); index++) {
        let label = `문답 ${index - 1}`;
        if (index === 1) label = "썸네일";
        artifacts.push({ id: `family-${groupIndex + 1}-${index + 1}`, category: "새가족 문답", label: "새가족 문답", page: `${group.name} · ${label}`, element: <FamilyCard index={index} groupIndex={groupIndex} /> });
      }
    });
    if (sections.includes("senders")) (senders ?? []).forEach((sender, index) => {
      (cardPages.senders[index] ?? [[]]).forEach((_, page) => artifacts.push({ id: `sender-${index + 1}-${page + 1}`, category: "파송자", label: "파송자", page: `${sender.name || "미입력"} · ${page + 1}페이지`, element: <SenderCard index={index} page={page} /> }));
    });
    return artifacts;
  }, [sections, families, senders, pages.length, month, cardPages.families, cardPages.senders]);
  const [filter, setFilter] = useState("전체");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [format, setFormat] = useState("png");
  const [downloading, setDownloading] = useState(false);
  const selected = artifacts.filter((artifact) => !excluded.includes(artifact.id));
  const categories = ["전체", ...new Set(artifacts.map((artifact) => artifact.category))];
  const download = async (all: boolean) => {
    if (downloading || preparing) return;
    setDownloading(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const ids = (all ? artifacts : selected).map((artifact) => artifact.id);
      await exportCards(ids, format === "jpeg" ? "jpeg" : "png", all || ids.length > 1);
      toast("결과물을 내려받았어요");
    } catch { toast.error("파일을 만들지 못했어요. 다시 시도해 주세요"); }
    finally { setDownloading(false); }
  };
  if (preparing) return <WeeklyStepSkeleton step={3} />;
  return <section className={`weekly-centered mx-auto w-full max-w-[1200px] px-0 ${detail ? "mt-8" : "mt-[60px]"}`} aria-label="결과물 목록">
    {!detail && <div className="flex min-h-[382px] flex-col items-center justify-center rounded-3xl bg-export-hero px-6 py-11 text-center">
      <span className="relative block size-[102px]" aria-hidden="true"><Image src="/images/weekly/9bdee.png" alt="" width={102} height={102} className="result-check-base" /><span className="result-check-fill absolute inset-0 overflow-hidden"><Image src="/images/weekly/9bdee.png" alt="" width={102} height={102} /></span></span>
      <h2 className="mt-4 text-[26px] leading-8 font-bold tracking-[-2.08px] text-hero-foreground max-sm:text-xl">이번 주 결과물이<br />모두 준비됐어요</h2>
      <Button loading={downloading} disabled={!artifacts.length || preparing} onClick={() => download(true)} className="weekly-zip-button mt-8 h-12 gap-1.5 rounded-[16px] px-7 text-base font-extrabold tracking-[-0.48px]">{!downloading && <Image src="/images/weekly/f4a70.svg" alt="" width={18} height={18} />}전부 ZIP으로 받기</Button>
    </div>}
    <div className="mt-10 flex flex-wrap gap-2" aria-label="결과물 종류">
      {categories.map((category) => <Button key={category} aria-pressed={filter === category} variant={filter === category ? "default" : "outline"} className="weekly-result-filter h-10 gap-[5px] rounded-full px-4 font-semibold tracking-[-0.42px] transition-colors active:translate-y-0" onClick={() => setFilter(category)}>{category}<span>{category === "전체" ? artifacts.length : artifacts.filter((artifact) => artifact.category === category).length}</span></Button>)}
    </div>
    <div className="mt-5 grid grid-cols-5 gap-x-5 gap-y-7 max-xl:grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
      {artifacts.map((artifact) => <figure key={artifact.id} data-artifact-id={artifact.id} hidden={filter !== "전체" && filter !== artifact.category} className="relative min-w-0">
        <div className={`weekly-result-thumb${artifact.id === "bulletin-thumbnail" ? " weekly-result-landscape" : ""}`}>{artifact.element}</div>
        <label htmlFor={`select-${artifact.id}`} className="absolute inset-0 z-10 cursor-pointer rounded-xl"><span className="sr-only">{artifact.label} {artifact.page} 선택</span></label>
        <Checkbox id={`select-${artifact.id}`} disabled={downloading} checked={!excluded.includes(artifact.id)} onCheckedChange={(checked) => setExcluded((current) => checked ? current.filter((id) => id !== artifact.id) : [...current, artifact.id])} aria-label={`${artifact.label} ${artifact.page} 선택`} className="absolute top-3 left-3 z-20 size-6 rounded-md border-primary bg-card data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
        <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-secondary-foreground"><span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs">{artifact.label}</span>{artifact.page}</figcaption>
      </figure>)}
    </div>
    <div className={`weekly-download-bar fixed ${detail ? "bottom-6" : "bottom-[96px]"} left-1/2 z-30 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-7 text-primary-foreground shadow-xl max-sm:gap-2 max-sm:pl-4`}>
      <span className="min-w-[80px] shrink-0 text-base font-bold tracking-[-0.48px] tabular-nums" aria-live="polite">{selected.length}장 선택됨</span><span className="h-4 w-px bg-primary-foreground/20" />
      <Select disabled={downloading} value={format} onValueChange={setFormat}><SelectTrigger aria-label="파일 형식" size="sm" className="w-auto gap-1 border-0 bg-transparent text-primary-foreground shadow-none"><SelectValue /><span className="text-muted-foreground max-sm:hidden">ㅣ 원본 크기</span></SelectTrigger><SelectContent position="popper" side="top" align="start" className="weekly-popover min-w-[110px] rounded-xl p-1"><SelectItem value="png">PNG</SelectItem><SelectItem value="jpeg">JPG</SelectItem></SelectContent></Select>
      <Button loading={downloading} disabled={!selected.length || preparing} onClick={() => download(false)} className="h-11 rounded-full bg-home-brand px-[22px] text-[15px] font-semibold tracking-[-0.45px] text-foreground hover:bg-home-brand/85">{!downloading && <Image src="/images/weekly/f4a70.svg" alt="" width={18} height={18} />}내려받기</Button>
    </div>
  </section>;
}
