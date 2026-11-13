"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import "./template-cards.css";

export function TemplateFrame({ children, label, className = "", height = 900 }: { children: React.ReactNode; label: string; className?: string; height?: number }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame.current?.querySelectorAll<HTMLElement>("[data-fit-height], [data-fit-width]").forEach(container => {
        const text = container.hasAttribute("data-fit-text") ? [container] : Array.from(container.querySelectorAll<HTMLElement>("[data-fit-text]"));
        text.forEach(element => element.style.removeProperty("font-size"));
        const sizes = text.map(element => parseFloat(getComputedStyle(element).fontSize));
        for (let scale = 0.98; scale >= 0.04 && ((container.dataset.fitHeight && container.offsetHeight > Number(container.dataset.fitHeight)) || (container.hasAttribute("data-fit-width") && container.scrollWidth > container.clientWidth)); scale -= 0.02) {
          text.forEach((element, i) => element.style.fontSize = `${sizes[i] * scale}px`);
        }
      });
    });
    return () => { cancelled = true; };
  }, [children]);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => node.style.setProperty("--template-scale", String(entry.contentRect.width / 720)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={frame} className={`news-card template-card ${className}`} style={{ aspectRatio: `720 / ${height}` }} role="img" aria-label={label}>
    <div className="template-sheet" data-export-html data-export-width="720" data-export-height={height} style={{ height }}>{children}</div>
  </div>;
}

// Keep the downloaded SVG's native dimensions; scale its wrapper into the Figma slot.
export function TemplateAsset({ name, x, y, width, height, nativeWidth = width, nativeHeight = height }: { name: string; x: number; y: number; width: number; height: number; nativeWidth?: number; nativeHeight?: number }) {
  if (name.endsWith(".png")) {
    const scale = Math.max(width / nativeWidth, height / nativeHeight);
    return <span className="template-asset" style={{ left: x, top: y, width, height, overflow: "hidden" }}><span className="template-asset" style={{ left: (width - nativeWidth * scale) / 2, top: (height - nativeHeight * scale) / 2, transform: `scale(${scale})` }}><Image src={`/images/templates/${name}`} alt="" width={nativeWidth} height={nativeHeight} style={{ width: nativeWidth, height: nativeHeight }} unoptimized /></span></span>;
  }
  return <span className="template-asset" style={{ left: x, top: y, transform: `scale(${width / nativeWidth}, ${height / nativeHeight})` }}><Image src={`/images/templates/${name}`} alt="" width={nativeWidth} height={nativeHeight} style={{ width: nativeWidth, height: nativeHeight }} unoptimized /></span>;
}
