"use client";

import { HomeDashboard } from "./home-dashboard";
import { useStartWeekly } from "./workspace-shell";

export function HomeMockup() {
  const startWeekly = useStartWeekly();
  return <HomeDashboard onCreate={startWeekly} />;
}
