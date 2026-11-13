"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BulletinPreview } from "@/features/home/data/mock-bulletins";
import { loadWeeklyList } from "@/features/weekly/actions";
import { reportServerError } from "@/features/auth/utils/report-server-error";
import { bulletinHref, bulletinTitle } from "@/features/bulletins/utils/format";
import "./home-motion.css";

const asset = "/images/home/";

export function HomeDashboard({ onCreate }: { onCreate: () => void }) {
  const [bulletins, setBulletins] = useState<BulletinPreview[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const loading = bulletins === null && !loadError;
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await loadWeeklyList();
        if (cancelled) return;
        if (!result.ok) { setLoadError(result.error.message); reportServerError(result.error); return; }
        const dates = result.data.map(record => record.date);
        setBulletins(dates.map(id => {
          const [month, week] = bulletinTitle(id).replace(" 주보", "").split(" ");
          return { id, month, week, publishedAt: `${Number(id.slice(5, 7))}/${Number(id.slice(-2))}`, previewImage: "/images/home/bulletin-preview.png" };
        }));
      } catch {
        if (!cancelled) { const message = "주보를 불러오지 못했어요. 연결을 확인해 주세요"; setLoadError(message); toast.error(message); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-w-0 flex-1 px-[51px] pt-20 pb-12 max-md:px-6">
      <div className="w-full max-w-[1076px]">
        <section aria-labelledby="automation-heading">
          <div className="home-heading-motion flex h-9 items-center gap-1">
            <Image src={`${asset}nav-card-news.png`} alt="" width={36} height={36} />
            <h1 id="automation-heading" className="text-xl leading-[normal] font-extrabold tracking-[-1.2px]">커뮤 자동화 도구</h1>
          </div>
          <Card className="home-hero-motion relative mt-5 h-[268px] w-full max-w-[522px] gap-0 rounded-[30px] bg-automation p-0 shadow-none ring-0">
            <div className="pointer-events-none absolute top-[61.72px] left-[-45.27px]" aria-hidden="true">
              <div className="origin-center rotate-[-23.204deg] opacity-40">
                <div className="home-hero-light relative h-[222.812px] w-[715px]">
                  <Image src="/images/templates/hero-glow.svg" alt="" width={914.8} height={422.612} className="absolute top-[-99.9px] left-[-99.9px] max-w-none" />
                </div>
              </div>
            </div>
            <Image src={`${asset}rock.png`} alt="" width={519} height={799} sizes="519px" priority className="pointer-events-none absolute top-[-53px] left-1/2 h-[799px] w-[519px] max-w-none -translate-x-[calc(50%-196.5px)] object-cover opacity-[0.2451]" />
            <h2 className="absolute top-[99px] left-1/2 -translate-x-1/2 text-center text-[28px] leading-[1.25] font-extrabold tracking-[-2.24px] text-hero-foreground">강단 라인업<br />자동화</h2>
            <Button onClick={onCreate} aria-label="강단 라인업 자동화 시작하기" className="absolute inset-0 h-full w-full rounded-[30px] border-0 bg-transparent p-0 hover:bg-card/5 active:translate-y-0">
              <span className="absolute right-[29px] bottom-[25px] flex size-12 items-center justify-center rounded-full bg-hero-action">
                <Image src={`${asset}hero-arrow.svg`} alt="" width={24} height={24} className="-rotate-90" />
              </span>
            </Button>
          </Card>
        </section>
        <section aria-labelledby="recent-heading" aria-busy={loading} className="mt-20">
          <div className="home-heading-motion flex h-9 items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Image src={`${asset}document.png`} alt="" width={36} height={36} />
              <h2 id="recent-heading" className="text-xl leading-[normal] font-extrabold tracking-[-1.2px]">최근 만든 주보</h2>
            </div>
            <Button variant="ghost" size="sm" disabled={loading || !!loadError || !bulletins?.length} className="px-3 tracking-[-0.84px] hover:bg-card/10" onClick={() => setShowAll(value => !value)}>{showAll ? "접기" : "전체 보기 →"}</Button>
          </div>
          {loading && <p role="status" className="sr-only">최근 주보를 불러오는 중이에요</p>}
          {loadError && <p role="alert" className="mt-5 text-sm text-muted-foreground">{loadError}</p>}
          {!loading && !loadError && bulletins?.length === 0 && <p className="mt-5 text-sm text-muted-foreground">저장된 주보가 없어요. 첫 주보를 만들어 주세요.</p>}
          <div className="home-heading-motion mt-[21px] grid grid-cols-[repeat(4,minmax(0,252px))] gap-[18px] max-lg:grid-cols-2 max-sm:grid-cols-1">
            {loading ? Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden="true" className="relative h-[164px] w-full rounded-[10px] border border-bulletin-border p-[18px]">
              <Skeleton className="h-3 w-14 motion-reduce:animate-none" />
              <Skeleton className="mt-3 h-6 w-12 motion-reduce:animate-none" />
              <Skeleton className="mt-1 h-6 w-24 motion-reduce:animate-none" />
              <Skeleton className="absolute right-3 bottom-3 size-10 rounded-full motion-reduce:animate-none" />
            </div>) : (bulletins ?? []).slice(0, showAll ? undefined : 4).map((bulletin) => (
              <Card key={bulletin.id} data-bulletin-id={bulletin.id} className="bulletin-card relative isolate h-[164px] w-full gap-0 overflow-visible rounded-[10px] bg-transparent p-0 shadow-none ring-0">
                <div className="bulletin-reveal absolute inset-x-0 top-0 h-[164px] overflow-hidden rounded-[10px] border border-bulletin-border">
                  <div className="bulletin-photo pointer-events-none absolute top-[164px] -left-px h-[122px] w-[calc(100%+2px)] overflow-hidden rounded-[9px] border-3 border-bulletin-photo-border" aria-hidden="true">
                    <Image src={bulletin.previewImage} alt="" fill sizes="(max-width: 640px) 90vw, 260px" loading="eager" className="object-cover object-bottom" />
                    <div className="absolute inset-0 bg-bulletin-photo-shade" />
                  </div>
                  <div className="pointer-events-none absolute top-0 -left-px w-[calc(100%+2px)]">
                    <div className="relative flex h-[164px] items-start justify-between bg-background px-[18px] pt-[18px] pb-4">
                      <Image src="/images/templates/bulletin-glow.svg" alt="" width={270} height={252} className="pointer-events-none absolute top-[83px] left-1/2 max-w-none -translate-x-1/2" />
                      <div className="relative flex flex-col gap-1">
                        <p className="text-sm leading-[17px] tracking-[-0.42px] text-muted-foreground">{bulletin.publishedAt} 발행</p>
                        <h3 className="text-[22px] leading-[28px] font-extrabold tracking-[-0.66px]">{bulletin.month}<br />{bulletin.week} 주보</h3>
                      </div>
                      <span className="absolute right-3 bottom-3 flex size-10 shrink-0 items-center justify-center rounded-full bg-home-brand">
                        <Image src="/images/templates/bulletin-arrow.svg" alt="" width={20} height={20} className="-rotate-90" />
                      </span>
                    </div>
                  </div>
                  <Button asChild className="absolute inset-0 h-full w-full rounded-[10px] border-0 bg-transparent p-0 hover:bg-transparent active:translate-y-0"><Link href={bulletinHref(bulletin.id)} aria-label={`${bulletin.month} ${bulletin.week} 주보 상세 보기`} /></Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
