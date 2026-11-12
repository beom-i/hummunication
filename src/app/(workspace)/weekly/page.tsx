import { Suspense } from "react";
import { WeeklyMockup } from "@/components/weekly/weekly-mockup";
import { WeeklyLoadingScreen } from "@/components/weekly/weekly-skeleton";

export default function WeeklyPage() {
  return <Suspense fallback={<WeeklyLoadingScreen />}><WeeklyMockup /></Suspense>;
}
