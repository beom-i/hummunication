"use client";

import { Button } from "@/components/ui/button";
import { useLogout } from "../hooks/use-logout";

export function LogoutButton() {
  const { logout, busy } = useLogout();
  return <Button onClick={logout} loading={busy}>로그아웃</Button>;
}
