"use client";

import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

const asset = "/images/home/";

function NavigationIcon({ name }: { name: "home" | "card-news" | "team" }) {
  return (
    <span className={`relative block size-4 shrink-0 overflow-hidden ${name === "card-news" ? "p-px" : ""}`}>
      <span className="relative block size-full overflow-hidden">
        <Image src={`${asset}nav-${name}.png`} alt="" width={1254} height={1254} sizes="22px"
          className="absolute -left-1/6 -top-1/6 size-[133.33%] max-w-none" />
      </span>
    </span>
  );
}

export function AppSidebar({ active = "home", onHome, onCreate, onTeam }: {
  active?: "home" | "weekly";
  onHome: () => void;
  onCreate: () => void;
  onTeam: () => void;
}) {
  const { state, toggleSidebar, setOpen, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const navigate = (action: () => void) => {
    action();
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={toggleSidebar}
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              aria-expanded={!collapsed}
              className="relative h-12 rounded-lg duration-200 hover:bg-brand-mark hover:text-sidebar-foreground active:bg-brand-mark group-data-[collapsible=icon]:h-[50px]! group-data-[collapsible=icon]:w-[29px]! group-data-[collapsible=icon]:p-2!">
              <Image src={`${asset}logo.png`} alt="" width={32} height={32} loading="eager" className="absolute top-1/2 left-2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-100" />
              <span className="flex min-w-[199px] flex-1 flex-col gap-0.5 whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                <span className="flex h-[15px] items-center"><Image src={`${asset}wordmark.svg`} alt="HUMMUNICATION" width={102} height={10} /></span>
                <span className="text-xs leading-[15px] tracking-[-0.96px] text-sidebar-foreground/70">27 커뮤팀</span>
              </span>
              <Image src={`${asset}chevrons-up-down.svg`} alt="" width={16} height={16} className="shrink-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0 overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="whitespace-nowrap group-data-[collapsible=icon]:mt-0">워크스페이스</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "home"} onClick={() => { navigate(onHome); setOpen(true); }} tooltip="홈" aria-label="홈"
                className="rounded-lg font-bold group-data-[collapsible=icon]:w-[29px]!">
                <NavigationIcon name="home" /><span className="shrink-0 whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">홈</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "weekly"} onClick={() => { navigate(onCreate); setOpen(false); }} tooltip="카드뉴스 만들기" aria-label="카드뉴스 만들기"
                className="rounded-lg font-bold group-data-[collapsible=icon]:w-[29px]!">
                <NavigationIcon name="card-news" /><span className="shrink-0 whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">카드뉴스 만들기</span>
              </SidebarMenuButton>
              <SidebarMenuBadge aria-hidden={collapsed} className="right-2 transition-opacity duration-200 group-data-[collapsible=icon]:block group-data-[collapsible=icon]:opacity-0">2</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="whitespace-nowrap group-data-[collapsible=icon]:mt-0">팀</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate(onTeam)} tooltip="팀원" aria-label="팀원"
                className="rounded-lg font-bold group-data-[collapsible=icon]:w-[29px]!">
                <NavigationIcon name="team" /><span className="shrink-0 whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">팀원</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex h-[51px] w-full items-center gap-2 overflow-hidden rounded-lg p-2 transition-[height] duration-200 group-data-[collapsible=icon]:h-[50px]">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-base text-sidebar-accent-foreground">K</AvatarFallback>
          </Avatar>
          <div className="flex min-w-[159px] flex-1 flex-col gap-0.5 leading-normal whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
            <span className="text-sm font-medium">팀원</span>
            <span className="text-xs text-sidebar-foreground/70">팀장 · 37기</span>
          </div>
          <Image src={`${asset}chevrons-up-down.svg`} alt="" width={16} height={16} className="shrink-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0" />
        </div>
      </SidebarFooter>
      <SidebarRail aria-label="사이드바 접기 또는 펼치기" title="사이드바 접기 또는 펼치기" />
    </Sidebar>
  );
}
