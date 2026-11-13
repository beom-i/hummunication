"use client";
import { useEffect, useState } from "react";
import { preparePhoto } from "@/features/files/utils/photo-optimization";

export function usePhotoSource(source: string, quality?: 0.85 | 0.65 | null) {
  const [result, setResult] = useState<{ source: string; quality: number; url?: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!quality) return;
    let cancelled = false;
    void preparePhoto(source, quality).then(photo => {
      if (!cancelled) setResult({ source, quality, url: photo.source });
    }).catch(() => { if (!cancelled) setResult({ source, quality, error: true }); });
    return () => { cancelled = true; };
  }, [source, quality]);
  const current = quality && result?.source === source && result.quality === quality ? result : null;
  return { source: current?.url ?? source, error: current?.error ?? false };
}
