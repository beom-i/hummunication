"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppSidebar } from "./app-sidebar";
import { EntrySplash } from "./entry-splash";
import { WorkIntro } from "./work-intro";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const StartWeeklyContext = createContext<(() => void) | null>(null);

export function useStartWeekly() {
  const startWeekly = useContext(StartWeeklyContext);
  if (!startWeekly) throw new Error("WorkspaceShell is required");
  return startWeekly;
}

function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen } = useSidebar();
  const weekly = pathname === "/weekly" || pathname === "/bulletins";
  const [entering, setEntering] = useState(!weekly);
  const [weeklyIntroStartedAt, setWeeklyIntroStartedAt] = useState<number | null>(null);
  const finishEntry = useCallback(() => setEntering(false), []);
  const finishWeeklyIntro = useCallback(() => setWeeklyIntroStartedAt(null), []);
  const startWeekly = useCallback(() => {
    if (weeklyIntroStartedAt !== null) return;
    flushSync(() => setWeeklyIntroStartedAt(performance.now()));
    // Paint the overlay before collapsing the sidebar or starting navigation.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setOpen(false);
      router.push("/weekly?step=1");
    }));
  }, [router, setOpen, weeklyIntroStartedAt]);
  const showComingSoon = () => toast("개발 중이에요", { position: "top-center", style: { pointerEvents: "none" } });

  return <StartWeeklyContext.Provider value={startWeekly}>
    <div className="home-scene flex min-h-svh w-full" data-view={weekly ? "weekly" : "home"} data-entering={entering}>
      <div className="contents" inert={entering || weeklyIntroStartedAt !== null}>
        <AppSidebar active={weekly ? "weekly" : "home"} onHome={() => router.push("/home")} onCardNews={showComingSoon} onTeam={showComingSoon} />
        <SidebarTrigger aria-label="메뉴 열기" className="fixed top-4 left-4 z-20 bg-background md:hidden" />
        {children}
      </div>
      {entering && <EntrySplash onComplete={finishEntry} />}
      {weeklyIntroStartedAt !== null && <div className="home-theme fixed inset-0 z-50" data-weekly-intro><WorkIntro startedAt={weeklyIntroStartedAt} onComplete={finishWeeklyIntro} /></div>}
    </div>
  </StartWeeklyContext.Provider>;
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const weekly = pathname === "/weekly" || pathname === "/bulletins";
  return <TooltipProvider delayDuration={150}>
    <SidebarProvider defaultOpen={!weekly} style={{ "--sidebar-width-icon": "64px" } as React.CSSProperties}>
      <WorkspaceContent>{children}</WorkspaceContent>
    </SidebarProvider>
    <Toaster />
  </TooltipProvider>;
}
