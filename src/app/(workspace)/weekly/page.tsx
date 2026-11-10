import { Suspense } from "react";
import { WeeklyMockup } from "@/components/weekly/weekly-mockup";

export default function WeeklyPage() {
  return <Suspense fallback={<main className="min-h-svh flex-1" aria-label="주보 화면 불러오는 중" />}><WeeklyMockup /></Suspense>;
}
