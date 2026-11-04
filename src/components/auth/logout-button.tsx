"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/auth/login");
  };

  return <Button onClick={logout}>로그아웃</Button>;
}
