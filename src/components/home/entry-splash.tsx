"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import "./splash-motion.css";

const letters = [
  {"id": "147:4989", "src": "0c1f1.svg", "x": 626.9985, "y": 518.92, "width": 60.143, "height": 65.918},
  {"id": "147:4990", "src": "3dbe4.svg", "x": 684.999, "y": 517.92, "width": 64.982, "height": 65.918},
  {"id": "147:4792", "src": "db8c1.svg", "x": 1289.9979999999998, "y": 440.71, "width": 54.704, "height": 64.229},
  {"id": "147:4991", "src": "db8c1.svg", "x": 1289.9979999999998, "y": 519.71, "width": 54.704, "height": 64.229},
  {"id": "147:4793", "src": "0f38a.svg", "x": 1220.999, "y": 439.0, "width": 64.982, "height": 65.918},
  {"id": "147:4992", "src": "0f38a.svg", "x": 1220.999, "y": 518.0, "width": 64.982, "height": 65.918},
  {"id": "147:4794", "src": "8bf5b.svg", "x": 1203.9965, "y": 440.86, "width": 13.447, "height": 64.063},
  {"id": "147:4993", "src": "8bf5b.svg", "x": 1203.9965, "y": 519.86, "width": 13.447, "height": 64.063},
  {"id": "147:4795", "src": "42bb6.svg", "x": 1147.999, "y": 440.86, "width": 54.862, "height": 64.061},
  {"id": "147:4994", "src": "42bb6.svg", "x": 1147.999, "y": 519.86, "width": 54.862, "height": 64.061},
  {"id": "147:4796", "src": "19eff.svg", "x": 1087.9995000000001, "y": 440.71, "width": 63.301, "height": 64.229},
  {"id": "147:4995", "src": "19eff.svg", "x": 1087.9995000000001, "y": 519.71, "width": 63.301, "height": 64.229},
  {"id": "147:4797", "src": "5b13d.svg", "x": 1028.9985, "y": 440.12, "width": 60.143, "height": 65.918},
  {"id": "147:4996", "src": "5b13d.svg", "x": 1028.9985, "y": 519.12, "width": 60.143, "height": 65.918},
  {"id": "147:4798", "src": "8bf5b.svg", "x": 1011.9965000000001, "y": 440.86, "width": 13.447, "height": 64.063},
  {"id": "147:4997", "src": "8bf5b.svg", "x": 1011.9965000000001, "y": 519.86, "width": 13.447, "height": 64.063},
  {"id": "147:4799", "src": "db8c1.svg", "x": 950.998, "y": 440.71, "width": 54.704, "height": 64.229},
  {"id": "147:4998", "src": "db8c1.svg", "x": 950.998, "y": 519.71, "width": 54.704, "height": 64.229},
  {"id": "147:4800", "src": "f8be8.svg", "x": 892.005, "y": 441.38, "width": 54.45, "height": 64.86},
  {"id": "147:4999", "src": "f8be8.svg", "x": 892.005, "y": 520.38, "width": 54.45, "height": 64.86},
  {"id": "147:4801", "src": "21983.svg", "x": 820.9995, "y": 440.31, "width": 66.081, "height": 64.612},
  {"id": "147:5000", "src": "21983.svg", "x": 820.9995, "y": 519.31, "width": 66.081, "height": 64.612},
  {"id": "147:4802", "src": "20f18.svg", "x": 749.9994999999999, "y": 440.88, "width": 65.361, "height": 64.038},
  {"id": "147:5001", "src": "20f18.svg", "x": 749.9994999999999, "y": 519.88, "width": 65.361, "height": 64.038},
  {"id": "147:4803", "src": "f77cd.svg", "x": 691.005, "y": 441.38, "width": 54.45, "height": 64.86},
  {"id": "147:4804", "src": "f6a13.svg", "x": 631.1959999999999, "y": 440.61, "width": 54.688, "height": 64.307},
] as const;

export function EntrySplash({ onComplete }: { onComplete: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = stage.current!;
    const observer = new ResizeObserver(([entry]) => {
      container.style.setProperty("--splash-scale", String(Math.min(entry.contentRect.width / 1440, entry.contentRect.height / 1024)));
    });
    observer.observe(container);
    const timer = window.setTimeout(onComplete, 3000);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [onComplete]);

  return (
    <div ref={stage} className="entry-splash fixed inset-0 z-50 overflow-hidden bg-background" role="status" aria-label="HUMMUNICATION 불러오는 중">
      <div className="splash-stage absolute top-1/2 left-1/2 h-[1024px] w-[1440px]" aria-hidden="true">
        <Image src="/images/weekly/fcc4e.png" alt="" width={1013} height={1559} priority className="absolute top-0 left-[-245px] max-w-none opacity-57" />
        {letters.filter(({ id }) => id === "147:4803" || id === "147:4804").map(({ id, src, x, y, width, height }) => (
          <span key={`title-${id}`} className="absolute" style={{ left: x, top: y, width, height }}><Image src={`/images/weekly/${src}`} alt="" width={width} height={height} loading="eager" unoptimized /></span>
        ))}
        {letters.map(({ id, src, x, y, width, height }) => (
          <span key={id} className="absolute" style={{ left: x, top: y, width, height }}>
            <Image src={`/images/weekly/${src}`} alt="" width={width} height={height} loading="eager" unoptimized className={`splash-${id.replace(":", "-")}`} />
          </span>
        ))}
      </div>
      <button className="sr-only focus:not-sr-only focus:absolute focus:right-6 focus:bottom-6" onClick={onComplete}>홈으로 건너뛰기</button>
    </div>
  );
}
