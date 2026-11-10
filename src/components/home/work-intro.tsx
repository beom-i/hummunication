"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const asset = "/images/home/";

export function WorkIntro({ onComplete }: { onComplete: () => void }) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const images = Array.from(container.current?.querySelectorAll("img") ?? []);
    Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
      if (!cancelled) timer = window.setTimeout(onComplete, 3000);
    });
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [onComplete]);

  return (
    <main ref={container} className="relative flex min-h-svh w-full flex-col items-center overflow-hidden pt-[140px] max-sm:pt-28" aria-labelledby="work-intro-heading">
      <Image loading="eager" src={`${asset}intro-glow.svg`} alt="" width={1089.8} height={381.8} className="pointer-events-none absolute top-[-211.9px] left-1/2 max-w-none -translate-x-1/2 rotate-180 -scale-y-100" />
      <h1 id="work-intro-heading" className="relative text-center text-[44px] leading-[1.25] font-extrabold tracking-[-3.52px] max-sm:text-[32px] max-sm:tracking-[-2.56px]">
        <span className="text-home-brand">강단 라인업 작업</span>을<br />시작합니다
      </h1>
      <div className="relative mt-[43px] h-[565px] w-[570px] shrink-0 max-sm:origin-top max-sm:scale-[0.58]" aria-hidden="true">
        <Image loading="eager" src={`${asset}gear.png`} alt="" width={60} height={60} className="intro-icon absolute top-0 left-[262.58px]" />
        <span className="intro-icon absolute top-[60px] left-[452.58px] size-[60px] overflow-hidden">
          <Image loading="eager" src={`${asset}document.png`} alt="" width={72} height={72} className="absolute -top-1.5 -left-1.5 max-w-none" />
        </span>
        <Image loading="eager" src={`${asset}nav-card-news.png`} alt="" width={60} height={60} className="intro-icon absolute top-[60px] left-[73.58px] -rotate-90" />
        <div className="intro-window intro-window-back absolute top-[194.2px] left-0 flex h-[330.794px] w-[433.245px] items-center justify-center">
          <div className="relative h-[278.05px] w-[398.425px] -rotate-8 overflow-hidden rounded-[14.159px] border-[1.287px] border-window-line bg-window">
            <Image loading="eager" src={`${asset}window-controls.svg`} alt="" width={43.7635} height={10.2973} className="absolute top-[11.58px] left-[12.87px]" />
            <div className="absolute top-[36.04px] left-[-1.29px] h-[1.287px] w-[302.483px] bg-window-line" />
          </div>
        </div>
        <Image loading="eager" src={`${asset}window-middle.svg`} alt="" width={398.425} height={278.05} className="intro-window intro-window-middle absolute top-[177.56px] left-[102px] max-w-none rounded-[14.159px] backdrop-blur-[17px]" />
        <div className="intro-window intro-window-front absolute top-[246.33px] left-[144.19px] flex h-[318.394px] w-[425.448px] items-center justify-center">
          <Image loading="eager" src={`${asset}window-front.svg`} alt="" width={398.425} height={278.05} className="max-w-none rotate-[-6.03deg] rounded-[14.159px] backdrop-blur-[31.7418px]" />
        </div>
      </div>
      <button type="button" onClick={onComplete} className="sr-only focus:not-sr-only focus:absolute focus:bottom-8">날짜 선택으로 건너뛰기</button>
    </main>
  );
}
