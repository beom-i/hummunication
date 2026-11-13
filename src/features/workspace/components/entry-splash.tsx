"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./splash-motion.css";

const letters = [
  { src: "03e37.svg", x: 627, y: 488.92, width: 60.143, height: 65.918, motion: "splash-c" },
  { src: "87806.svg", x: 685, y: 487.92, width: 64.982, height: 65.918, motion: "splash-o" },
  { src: "db8c1.svg", x: 1290, y: 489.71, width: 54.704, height: 64.229 },
  { src: "0f38a.svg", x: 1221, y: 488, width: 64.982, height: 65.918 },
  { src: "8bf5b.svg", x: 1204, y: 489.86, width: 13.447, height: 64.063 },
  { src: "42bb6.svg", x: 1148, y: 489.86, width: 54.862, height: 64.061 },
  { src: "19eff.svg", x: 1088, y: 489.71, width: 63.301, height: 64.229 },
  { src: "5b13d.svg", x: 1029, y: 489.12, width: 60.143, height: 65.918 },
  { src: "8bf5b.svg", x: 1012, y: 489.86, width: 13.447, height: 64.063 },
  { src: "db8c1.svg", x: 951, y: 489.71, width: 54.704, height: 64.229 },
  { src: "f8be8.svg", x: 892, y: 490.38, width: 54.45, height: 64.86 },
  { src: "21983.svg", x: 821, y: 489.31, width: 66.081, height: 64.612 },
  { src: "20f18.svg", x: 750, y: 489.88, width: 65.361, height: 64.038 },
  { src: "96b87.svg", x: 691.005, y: 411.38, width: 54.45, height: 64.86, motion: "splash-u" },
  { src: "e01aa.svg", x: 631.196, y: 410.61, width: 54.688, height: 64.307, motion: "splash-h" },
];
const templateLetters = new Set(["03e37.svg", "87806.svg", "96b87.svg", "e01aa.svg"]);

export function EntrySplash({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const container = stage.current!;
    const observer = new ResizeObserver(([entry]) => container.style.setProperty("--splash-scale", String(Math.min(entry.contentRect.width / 1440, entry.contentRect.height / 1024))));
    observer.observe(container);
    const timer = window.setTimeout(() => setAnimated(true), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 200 : 1850);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!ready || !animated) return;
    const timer = window.setTimeout(onComplete, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300);
    return () => window.clearTimeout(timer);
  }, [ready, animated, onComplete]);
  return <div ref={stage} className="entry-splash fixed inset-0 z-50 overflow-hidden bg-background" data-ready={ready} data-exiting={ready && animated} role="status" aria-label="HUMMUNICATION 불러오는 중">
    <div className="splash-stage absolute top-1/2 left-1/2 h-[1024px] w-[1440px]" aria-hidden="true">
      <Image src="/images/weekly/fcc4e.png" alt="" width={1013} height={1559} priority className="absolute top-0 left-[-245px] max-w-none opacity-57" />
      {letters.map(({ src, x, y, width, height, motion }) => <span key={`${src}-${x}`} className="absolute" style={{ left: x, top: y, width, height }}><Image src={`/images/${templateLetters.has(src) ? "templates" : "weekly"}/${src}`} alt="" width={width} height={height} loading="eager" unoptimized className={motion} /></span>)}
    </div>
    <button disabled={!ready} className="sr-only focus:not-sr-only focus:absolute focus:right-6 focus:bottom-6" onClick={onComplete}>시작 화면 건너뛰기</button>
  </div>;
}
