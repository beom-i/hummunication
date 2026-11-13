"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authUnavailable, loginRequired, teamAccountRequired } from "../utils/session";

export function AuthNotice() {
  const search = useSearchParams();
  useEffect(() => {
    const reason = search.get("reason");
    if (reason === "required") toast.error(loginRequired.message, { id: "authentication" });
    else if (reason === "forbidden") toast.error(teamAccountRequired.message, { id: "authentication" });
    else if (reason === "unavailable") toast.error(authUnavailable.message, { id: "authentication" });
    else if (reason === "logged-out") toast.success("로그아웃했어요", { id: "authentication" });
    else if (reason === "invalid-link") toast.error("로그인 링크가 만료되었거나 올바르지 않아요. 링크를 다시 확인해 주세요", { id: "authentication" });
    else return;
    const url = new URL(window.location.href);
    url.searchParams.delete("reason");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [search]);
  return null;
}
