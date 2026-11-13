"use client";

import { toast } from "sonner";
import type { AppError } from "@/lib/result";
import { loginHref } from "./session";

export function reportServerError(error: AppError) {
  if (error.code === "UNAUTHORIZED") {
    toast.error(error.message, { id: "authentication" });
    window.location.replace(loginHref(window.location.pathname + window.location.search));
    return;
  }
  toast.error(error.message);
}
