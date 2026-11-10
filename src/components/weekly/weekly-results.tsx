"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulletinCard, FamilyCard, SermonCard, familyPageCount } from "./preview-cards";
import { exportCards } from "./export-cards";
import type { WeeklyFormData } from "./schemas";

type Artifact = { id: string; category: string; label: string; page: string; element: React.ReactNode };

export function WeeklyResults() {
  const { control } = useFormContext<WeeklyFormData>();
  const sections = useWatch({ control, name: "sections" });
  const groups = useWatch({ control, name: "groups" });
  const artifacts = useMemo(() => {
    const artifacts: Artifact[] = [];
    if (sections.includes("thumbnail")) artifacts.push({ id: "bulletin-thumbnail", category: "주보 썸네일", label: "주보 썸네일", page: "11월 주보", element: <BulletinCard /> });
    if (sections.includes("cover")) artifacts.push({ id: "bulletin-cover", category: "주보 표지", label: "주보 표지", page: "11월 주보", element: <BulletinCard cover /> });
    if (sections.includes("sermon")) for (let index = 0; index < 7; index++) artifacts.push({ id: `sermon-${index + 1}`, category: "설교 정리", label: "설교 정리", page: `${index + 1}페이지`, element: <SermonCard index={index} /> });
    if (sections.includes("family")) groups.forEach((group, groupIndex) => {
      for (let index = 0; index < familyPageCount(group); index++) artifacts.push({ id: `family-${groupIndex + 1}-${index + 1}`, category: "새가족 문답", label: "새가족 문답", page: `${group.name} · ${index === 0 ? "표지" : index === 1 ? "썸네일" : `문답 ${index - 1}`}`, element: <FamilyCard index={index} groupIndex={groupIndex} /> });
    });
    return artifacts;
  }, [sections, groups]);
  const [filter, setFilter] = useState("전체");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [format, setFormat] = useState("png");
  const [downloading, setDownloading] = useState(false);
  const selected = artifacts.filter((artifact) => !excluded.includes(artifact.id));
  const categories = ["전체", ...new Set(artifacts.map((artifact) => artifact.category))];
  const download = async (all: boolean) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const ids = (all ? artifacts : selected).map((artifact) => artifact.id);
      await exportCards(ids, format === "jpeg" ? "jpeg" : "png", all || ids.length > 1);
      toast("목업 결과물을 내려받았어요");
    } catch { toast.error("파일을 만들지 못했어요. 다시 시도해 주세요"); }
    finally { setDownloading(false); }
  };
  return <section className="weekly-centered mx-auto mt-[102px] w-full max-w-[1200px] px-0 max-xl:px-6" aria-label="결과물 목록">
    <div className="flex min-h-[382px] flex-col items-center justify-center rounded-3xl bg-export-hero px-6 py-11 text-center">
      <span className="relative block size-[102px]" aria-hidden="true"><Image src="/images/weekly/9bdee.png" alt="" width={102} height={102} className="result-check-base" /><span className="result-check-fill absolute inset-0 overflow-hidden"><Image src="/images/weekly/9bdee.png" alt="" width={102} height={102} /></span></span>
      <h2 className="mt-4 text-[26px] font-bold tracking-[-2.08px] text-hero-foreground max-sm:text-xl">이번 주 결과물이 모두 준비됐어요</h2>
      <p className="mt-1 text-base tracking-[-0.48px] text-secondary-foreground">주보 · 설교 정리 · 새가족 문답, 총 {artifacts.length}장</p>
      <Button loading={downloading} disabled={!artifacts.length} onClick={() => download(true)} className="mt-8 h-14 gap-1.5 rounded-2xl bg-home-brand px-7 text-base font-extrabold text-foreground hover:bg-home-brand/85">{!downloading && <Image src="/images/weekly/f4a70.svg" alt="" width={18} height={18} />}전부 ZIP으로 받기</Button>
    </div>
    {sections.includes("senders") && <p className="mt-4 text-sm text-muted-foreground">파송자 결과물은 입력 화면과 템플릿 연결 후 추가돼요.</p>}
    <div className="mt-10 flex flex-wrap gap-2" aria-label="결과물 종류">
      {categories.map((category) => <Button key={category} aria-pressed={filter === category} variant={filter === category ? "default" : "outline"} className="h-10 gap-1 rounded-full px-4 transition-colors active:translate-y-0" onClick={() => setFilter(category)}>{category}<span className={filter === category ? "text-home-brand" : "text-muted-foreground"}>{category === "전체" ? artifacts.length : artifacts.filter((artifact) => artifact.category === category).length}</span></Button>)}
    </div>
    <div className="mt-5 grid grid-cols-5 gap-x-5 gap-y-7 max-xl:grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
      {artifacts.map((artifact) => <figure key={artifact.id} data-artifact-id={artifact.id} hidden={filter !== "전체" && filter !== artifact.category} className="relative min-w-0">
        {artifact.element}
        <label htmlFor={`select-${artifact.id}`} className="absolute inset-0 z-10 cursor-pointer rounded-xl"><span className="sr-only">{artifact.label} {artifact.page} 선택</span></label>
        <Checkbox id={`select-${artifact.id}`} disabled={downloading} checked={!excluded.includes(artifact.id)} onCheckedChange={(checked) => setExcluded((current) => checked ? current.filter((id) => id !== artifact.id) : [...current, artifact.id])} aria-label={`${artifact.label} ${artifact.page} 선택`} className="absolute top-3 left-3 z-20 size-6 rounded-md border-primary bg-card data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
        <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-secondary-foreground"><span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs">{artifact.label}</span>{artifact.page}</figcaption>
      </figure>)}
    </div>
    <div className="weekly-download-bar fixed bottom-[96px] left-1/2 z-30 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-7 text-primary-foreground shadow-xl max-sm:gap-2 max-sm:pl-4">
      <span className="min-w-[80px] shrink-0 text-sm font-semibold tabular-nums" aria-live="polite">{selected.length}장 선택됨</span><span className="h-4 w-px bg-primary-foreground/20" />
      <Select disabled={downloading} value={format} onValueChange={setFormat}><SelectTrigger aria-label="파일 형식" size="sm" className="w-[86px] border-0 bg-transparent text-primary-foreground shadow-none"><SelectValue /></SelectTrigger><SelectContent position="popper" side="top" align="start" className="weekly-popover min-w-[110px] rounded-xl p-1"><SelectItem value="png">PNG</SelectItem><SelectItem value="jpeg">JPG</SelectItem></SelectContent></Select>
      <Button loading={downloading} disabled={!selected.length} onClick={() => download(false)} className="h-11 rounded-full bg-home-brand px-5 text-sm font-bold text-foreground hover:bg-home-brand/85">{!downloading && <Image src="/images/weekly/f4a70.svg" alt="" width={18} height={18} />}내려받기</Button>
    </div>
  </section>;
}
