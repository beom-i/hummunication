"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authUnavailable, loginHref, sessionError } from "../utils/session";
import { reportServerError } from "../utils/report-server-error";

export function SessionGuard() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const { data, error } = await createClient().auth.getClaims();
        if (cancelled) return;
        const failure = sessionError(data?.claims, error);
        if (failure?.code === "FORBIDDEN") window.location.replace(loginHref(window.location.pathname + window.location.search, "forbidden"));
        else if (failure) reportServerError(failure);
      } catch { if (!cancelled) reportServerError(authUnavailable); }
    };
    void verify();
    window.addEventListener("focus", verify);
    window.addEventListener("pageshow", verify);
    return () => { cancelled = true; window.removeEventListener("focus", verify); window.removeEventListener("pageshow", verify); };
  }, [pathname, query]);
  return null;
}
