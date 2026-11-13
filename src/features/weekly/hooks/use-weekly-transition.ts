"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { weeklyHref, weeklyLocation, type WeeklyView } from "../utils/workflow";

export function useWeeklyTransition(main: RefObject<HTMLElement | null>, editingId: string | null, pending: boolean) {
  const navigating = useRef(false);
  const transitionId = useRef(0);
  const [loadingTarget, setLoadingTarget] = useState<{ step: number; view: WeeklyView; pending: boolean } | null>(null);
  const loading = loadingTarget?.pending === true;
  const transitionTo = useCallback(async (nextStep: number, nextView: WeeklyView, commit?: () => void) => {
    const id = ++transitionId.current;
    navigating.current = true;
    const transitionStartedAt = performance.now();
    flushSync(() => setLoadingTarget({ step: nextStep, view: nextView, pending: true }));
    const animations: Animation[] = [];
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        main.current?.querySelectorAll<HTMLElement>(".weekly-heading-copy, .weekly-content").forEach(element => {
          animations.push(element.animate([{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }], { duration: 120, easing: "ease-out", fill: "forwards" }));
        });
        await Promise.allSettled(animations.map(animation => animation.finished));
      }
      if (id !== transitionId.current || !main.current?.isConnected) return;
      flushSync(() => {
        main.current?.scrollTo({ top: 0, behavior: "instant" });
        commit?.();
      });
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      await document.fonts.ready;
      const images = Array.from(main.current?.querySelectorAll<HTMLImageElement>(".weekly-content img") ?? []);
      await Promise.all(images.filter(image => !image.complete && image.loading !== "lazy" && image.getClientRects().length > 0).map(image => image.decode().catch(() => undefined)));
      const remaining = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, 240 - (performance.now() - transitionStartedAt));
      if (remaining) await new Promise(resolve => window.setTimeout(resolve, remaining));
    } finally {
      animations.forEach(animation => animation.cancel());
      if (id === transitionId.current) {
        if (main.current?.isConnected && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setLoadingTarget(target => target ? { ...target, pending: false } : null);
          await new Promise(resolve => window.setTimeout(resolve, 180));
        }
        if (id === transitionId.current) setLoadingTarget(null);
      }
      if (id === transitionId.current) navigating.current = false;
    }
  }, [main]);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== "/weekly") return;
      const params = new URLSearchParams(window.location.search);
      const { step, view } = weeklyLocation(params);
      void transitionTo(step, view);
    };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [transitionTo]);

  const navigate = (nextStep: number, nextView?: WeeklyView, group?: number, card?: number) => {
    const href = weeklyHref(nextStep, nextView, editingId, group, card);
    if (pending || navigating.current || href === window.location.pathname + window.location.search) return;
    void transitionTo(nextStep, nextView ?? "options", () => window.history.pushState(null, "", href));
  };
  return { navigate, loading, loadingTarget };
}
