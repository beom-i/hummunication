"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "./app-sidebar";
import { HomeDashboard } from "./home-dashboard";
import { PublishDate } from "./publish-date";
import { WorkIntro } from "./work-intro";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function HomeContent() {
  const [view, setView] = useState<"home" | "intro" | "date">("home");
  const { setOpen, setOpenMobile } = useSidebar();
  const goHome = () => { setView("home"); setOpen(true); setOpenMobile(false); };
  const createBulletin = () => { setView("intro"); setOpen(false); setOpenMobile(false); };
  const showDate = useCallback(() => setView("date"), []);

  return (
    <div className="home-scene flex min-h-svh w-full" data-view={view}>
      {view === "intro" ? <WorkIntro onComplete={showDate} /> : (
        <>
          <AppSidebar onHome={goHome} onCreate={createBulletin} onTeam={() => toast("팀원 화면을 준비하고 있어요")} />
          <SidebarTrigger aria-label="메뉴 열기" className="fixed top-4 left-4 z-20 bg-background md:hidden" />
          {view === "date" ? <PublishDate /> : <HomeDashboard onCreate={createBulletin} />}
        </>
      )}
    </div>
  );
}

export function HomeMockup() {
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider style={{ "--sidebar-width-icon": "46px" } as React.CSSProperties}>
        <HomeContent />
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
