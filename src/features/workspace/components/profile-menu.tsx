"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { workspaceFont } from "../fonts";
import { useSidebar } from "@/components/ui/sidebar";

export type WorkspaceProfile = { name: string; email: string };

export function ProfileMenu({ profile }: { profile: WorkspaceProfile }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);
  const { logout, busy } = useLogout();
  const { isMobile } = useSidebar();
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return <DropdownMenu modal={false} open={open} onOpenChange={value => { cancelClose(); setOpen(value); }}>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={`${profile.name} 계정 메뉴`} className="sidebar-profile flex h-[51px] w-full items-center gap-2 overflow-hidden rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-foreground/10 focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-foreground/10"
        onPointerEnter={event => { if (event.pointerType === "mouse" && !isMobile) { hovering.current = true; cancelClose(); setOpen(true); } }}
        onPointerLeave={event => { if (event.pointerType === "mouse" && !isMobile) scheduleClose(); }} onPointerDown={() => { hovering.current = false; }} onKeyDown={() => { hovering.current = false; }}>
        <Avatar className="size-8"><AvatarFallback className="bg-sidebar-accent text-base text-sidebar-accent-foreground">{profile.name.slice(0, 1)}</AvatarFallback></Avatar>
        <span className="flex min-w-[159px] flex-1 flex-col gap-0.5 leading-normal whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
          <span className="truncate text-sm font-medium">{profile.name}</span><span className="text-xs text-sidebar-foreground/70">팀원 계정</span>
        </span>
        <ChevronUp className="size-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-200 group-data-[collapsible=icon]:opacity-0" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" sideOffset={10} aria-label="계정 메뉴" style={{ background: "var(--sidebar)" }} className={`${workspaceFont.variable} home-theme w-60 rounded-2xl border border-sidebar-border p-2 text-sidebar-foreground shadow-xl`}
      onPointerEnter={cancelClose} onPointerLeave={event => { if (event.pointerType === "mouse" && !isMobile) scheduleClose(); }}
      onCloseAutoFocus={event => { if (hovering.current) event.preventDefault(); }}>
      <DropdownMenuLabel className="px-3 py-2 text-sidebar-foreground"><span className="block text-sm font-semibold">{profile.name}</span><span className="mt-1 block truncate text-xs font-normal text-sidebar-foreground/60">{profile.email}</span></DropdownMenuLabel>
      <DropdownMenuSeparator className="mx-1 my-1 bg-sidebar-border" />
      <DropdownMenuItem disabled={busy} onSelect={event => { event.preventDefault(); void logout(); }} className="h-11 cursor-pointer rounded-xl px-3 text-sidebar-foreground focus:bg-sidebar-foreground/10 focus:text-sidebar-foreground">
        <LogOut className="size-4 text-sidebar-foreground/70" /><span>{busy ? "로그아웃 중…" : "로그아웃"}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
