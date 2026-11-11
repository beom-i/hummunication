"use client";

import { useRouter } from "next/navigation";
import { HomeDashboard } from "./home-dashboard";
import { useSidebar } from "@/components/ui/sidebar";

export function HomeMockup() {
  const router = useRouter();
  const { setOpen } = useSidebar();
  return <HomeDashboard onCreate={() => { setOpen(false); router.push("/weekly?step=1&intro=1"); }} />;
}
