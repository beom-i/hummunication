import { Suspense } from "react";
import { BulletinDetail } from "@/features/bulletins/components/bulletin-detail";
import { BulletinDetailSkeleton } from "@/features/bulletins/components/bulletin-detail-skeleton";

export default function BulletinPage() {
  return <Suspense fallback={<BulletinDetailSkeleton />}><BulletinDetail /></Suspense>;
}
