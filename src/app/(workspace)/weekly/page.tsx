import { Suspense } from "react";
import { WeeklyWorkspace } from "@/features/weekly/components/weekly-workspace";
import { WeeklyLoadingScreen } from "@/features/weekly/components/weekly-skeleton";

export default function WeeklyPage() {
  return <Suspense fallback={<WeeklyLoadingScreen />}><WeeklyWorkspace /></Suspense>;
}
