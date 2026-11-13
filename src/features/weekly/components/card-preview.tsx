"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  label: string;
  navigationLabel: string;
  index: number;
  count: number;
  onNavigate: (index: number) => void;
  children: React.ReactNode;
};

export function CardPreview({ label, navigationLabel, index, count, onNavigate, children }: Props) {
  const [fonts, setFonts] = useState<{ body: string; card: string } | null>(null);
  return <><section className="weekly-preview-panel weekly-paged-preview" aria-label={label}>
    <h2 className="mb-4 flex items-center justify-between gap-2 text-lg font-bold">카드뉴스 미리보기<span className="text-xs font-normal text-muted-foreground">눌러서 크게 보기</span></h2>
    <div className="weekly-preview-stage px-6 py-7">
      <div className="relative px-10">
        <Button variant="outline" size="icon-lg" className="preview-nav weekly-card-arrow left-0" aria-label={`이전 ${navigationLabel}`} disabled={index === 0} onClick={() => onNavigate(index - 1)}><Image src="/images/weekly/23c16.svg" alt="" width={20} height={20} /></Button>
        <button type="button" aria-label={`${navigationLabel} 크게 보기`} className="weekly-preview-card mx-auto block w-full max-w-[300px] rounded-2xl text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" onClick={event => {
          const style = getComputedStyle(event.currentTarget);
          setFonts({ body: style.getPropertyValue("--font-home-body"), card: style.getPropertyValue("--font-card-body") });
        }}>{children}</button>
        <Button variant="outline" size="icon-lg" className="preview-nav weekly-card-arrow right-0" aria-label={`다음 ${navigationLabel}`} disabled={index + 1 >= count} onClick={() => onNavigate(index + 1)}><Image src="/images/weekly/12acf.svg" alt="" width={20} height={20} /></Button>
      </div>
      <p className="mx-auto mt-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground" aria-live="polite">{index + 1}/{count}</p>
    </div>
  </section><Dialog open={fonts !== null} onOpenChange={open => { if (!open) setFonts(null); }}>
    <DialogContent style={{ "--font-home-body": fonts?.body, "--font-card-body": fonts?.card } as React.CSSProperties} className="weekly-popover max-h-[95svh] overflow-y-auto sm:max-w-[620px]">
      <DialogHeader><DialogTitle>{navigationLabel} {index + 1}/{count}</DialogTitle><DialogDescription>입력한 내용의 미리보기예요.</DialogDescription></DialogHeader>
      {fonts && <div className="mx-auto w-full max-w-[min(480px,calc(65svh*0.8))]">{children}</div>}
    </DialogContent>
  </Dialog></>;
}
