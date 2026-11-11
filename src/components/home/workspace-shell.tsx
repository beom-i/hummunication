"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppSidebar } from "./app-sidebar";
import { EntrySplash } from "./entry-splash";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const weekly = pathname === "/weekly";
  const [entering, setEntering] = useState(!weekly);

  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider defaultOpen={!weekly} style={{ "--sidebar-width-icon": "46px" } as React.CSSProperties}>
        <div className="home-scene flex min-h-svh w-full" data-view={weekly ? "weekly" : "home"} data-entering={entering}>
          <div className="contents" inert={entering}>
          <AppSidebar active={weekly ? "weekly" : "home"} onHome={() => router.push("/home")} onCreate={() => router.push("/weekly?step=1&intro=1")} onTeam={() => toast("팀원 화면을 준비하고 있어요")} />
          <SidebarTrigger aria-label="메뉴 열기" className="fixed top-4 left-4 z-20 bg-background md:hidden" />
          {children}
          </div>
          {entering && <EntrySplash onComplete={() => setEntering(false)} />}
        </div>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
