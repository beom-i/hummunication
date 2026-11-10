"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockBulletins, type BulletinPreview } from "./mock-bulletins";

const asset = "/images/home/";

export function HomeDashboard({ onCreate }: { onCreate: () => void }) {
  const [preview, setPreview] = useState<BulletinPreview | null>(null);

  return (
    <main className="min-w-0 flex-1 px-[51px] pt-20 pb-12 max-md:px-6">
      <div className="w-full max-w-[1076px]">
        <section aria-labelledby="automation-heading">
          <div className="home-heading-motion flex h-9 items-center gap-1">
            <Image src={`${asset}nav-card-news.png`} alt="" width={36} height={36} />
            <h1 id="automation-heading" className="text-xl leading-[normal] font-extrabold tracking-[-1.2px]">커뮤 자동화 도구</h1>
          </div>
          <Card className="home-hero-motion relative mt-5 h-[268px] w-full max-w-[522px] gap-0 rounded-[30px] bg-automation p-0 shadow-none ring-0">
            <div className="pointer-events-none absolute top-[344.438px] left-[-44.266px]" aria-hidden="true">
              <div className="origin-top-left rotate-[-23.204deg]">
                <div className="home-hero-light relative h-[222.812px] w-[715px]">
                  <Image src={`${asset}hero-glow.svg`} alt="" width={914.8} height={422.612} className="absolute top-[-99.9px] left-[-99.9px] max-w-none" />
                </div>
              </div>
            </div>
            <Image src={`${asset}rock.png`} alt="" width={519} height={799} sizes="519px" priority className="pointer-events-none absolute top-[-52px] left-1/2 h-[799px] w-[519px] max-w-none -translate-x-[calc(50%-1.5px)] object-cover opacity-[0.2451]" />
            <h2 className="absolute top-[99px] left-1/2 -translate-x-1/2 text-center text-[28px] leading-[1.25] font-extrabold tracking-[-2.24px] text-hero-foreground">강단 라인업<br />자동화</h2>
            <Button onClick={onCreate} aria-label="강단 라인업 자동화 시작하기" className="absolute inset-0 h-full w-full rounded-[30px] border-0 bg-transparent p-0 hover:bg-card/5 active:translate-y-0">
              <span className="absolute right-[29px] bottom-[25px] flex size-12 items-center justify-center rounded-full bg-hero-action">
                <Image src={`${asset}hero-arrow.svg`} alt="" width={24} height={24} className="-rotate-90" />
              </span>
            </Button>
          </Card>
        </section>
        <section aria-labelledby="recent-heading" className="mt-20">
          <div className="home-heading-motion flex h-9 items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Image src={`${asset}document.png`} alt="" width={36} height={36} />
              <h2 id="recent-heading" className="text-xl leading-[normal] font-extrabold tracking-[-1.2px]">최근 만든 주보</h2>
            </div>
            <Button variant="ghost" size="sm" className="px-3 tracking-[-0.84px] hover:bg-card/10" onClick={() => toast("최근 만든 주보를 모두 표시하고 있어요")}>전체 보기 →</Button>
          </div>
          <div className="mt-[21px] grid grid-cols-[repeat(5,196px)] gap-[19px] max-[1400px]:grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {mockBulletins.map((bulletin) => (
              <Card key={bulletin.id} data-bulletin-id={bulletin.id} className="bulletin-card relative isolate h-[108px] w-[196px] gap-0 overflow-visible rounded-[10px] bg-transparent p-0 shadow-none ring-0">
                <div className="bulletin-reveal absolute inset-x-0 top-0 h-[108px] overflow-hidden rounded-[10px] border border-bulletin-border">
                  <div className="bulletin-photo pointer-events-none absolute top-[111px] -left-px h-[122px] w-[196px] overflow-hidden rounded-[9px] border-3 border-bulletin-photo-border" aria-hidden="true">
                    <Image src={bulletin.previewImage} alt="" fill sizes="190px" loading="eager" className="object-cover object-bottom" />
                    <div className="absolute inset-0 bg-bulletin-photo-shade" />
                  </div>
                  <div className="pointer-events-none absolute top-0 -left-px w-[196px]">
                    <div className="flex h-[99px] items-center justify-between bg-background px-[18px] pt-3.5 pb-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs leading-[15px] tracking-[-0.36px] text-muted-foreground">{bulletin.publishedAt} 발행</p>
                        <h3 className="text-xl leading-[25px] font-extrabold tracking-[-0.6px]">{bulletin.month}<br />{bulletin.week} 주보</h3>
                      </div>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-home-brand">
                        <Image src={`${asset}bulletin-preview-arrow.svg`} alt="" width={18} height={18} className="-rotate-90" />
                      </span>
                    </div>
                    <Image src={`${asset}bulletin-edge.svg`} alt="" width={196} height={25} className="-scale-y-100" />
                  </div>
                  <Button onClick={() => setPreview(bulletin)} aria-label={`${bulletin.month} ${bulletin.week} 주보 미리보기`} className="absolute inset-0 h-full w-full rounded-[10px] border-0 bg-transparent p-0 hover:bg-transparent active:translate-y-0" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="home-theme">
          <DialogHeader>
            <DialogTitle>{preview?.month} {preview?.week} 주보</DialogTitle>
            <DialogDescription>{preview?.publishedAt} 발행</DialogDescription>
          </DialogHeader>
          {preview && <Image src={preview.previewImage} alt="주보 표지 목업" width={720} height={514} sizes="(max-width: 480px) 90vw, 400px" className="h-auto w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
