import { Suspense } from "react";
import { BulletinDetail } from "@/components/bulletins/bulletin-detail";

export default function BulletinPage() {
  return <Suspense fallback={<main className="min-h-svh flex-1" aria-label="주보 상세 불러오는 중" />}><BulletinDetail /></Suspense>;
}
