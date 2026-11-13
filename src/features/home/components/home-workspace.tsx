"use client";

import { HomeDashboard } from "./home-dashboard";
import { useStartWeekly } from "@/features/workspace/components/workspace-shell";

export function HomeWorkspace() {
  const startWeekly = useStartWeekly();
  return <HomeDashboard onCreate={startWeekly} />;
}
