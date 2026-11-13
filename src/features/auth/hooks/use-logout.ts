"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportServerError } from "../utils/report-server-error";

export function useLogout() {
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/auth/login?reason=logged-out");
    } catch {
      reportServerError({ code: "INTERNAL_ERROR", message: "로그아웃하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요" });
      setBusy(false);
    }
  };
  return { logout, busy };
}
