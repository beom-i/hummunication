import localFont from "next/font/local";
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginHref, sessionError } from "@/features/auth/utils/session";
import { Spinner } from "@/components/ui/spinner";
import { workspaceFont } from "@/features/workspace/fonts";

const pretendard = localFont({
  src: "../../../public/fonts/pretendard/PretendardVariable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-card-body",
  preload: false,
});
const katibeh = localFont({ src: "../../../public/fonts/katibeh/Katibeh-Regular.ttf", weight: "400", display: "swap", variable: "--font-card-display", preload: false });
const hand = localFont({ src: "../../../public/fonts/just-another-hand/JustAnotherHand-Regular.ttf", weight: "400", display: "swap", variable: "--font-card-hand", preload: false });

async function AuthenticatedWorkspace({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  const failure = sessionError(data?.claims, error);
  if (failure) {
    if (failure.code === "FORBIDDEN") redirect(loginHref("/home", "forbidden"));
    if (failure.code === "INTERNAL_ERROR") redirect(loginHref("/home", "unavailable"));
    redirect(loginHref("/home"));
  }
  const claims = data!.claims;
  const displayName = claims.user_metadata?.display_name;
  let name = "팀원";
  if (typeof displayName === "string" && displayName.trim()) name = displayName.trim();
  const profile = { name, email: String(claims.email ?? "") };
  return <WorkspaceShell profile={profile}>{children}</WorkspaceShell>;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={`home-theme min-h-svh ${workspaceFont.variable} ${pretendard.variable} ${katibeh.variable} ${hand.variable}`}><Suspense fallback={<main className="flex min-h-svh items-center justify-center gap-2" role="status"><Spinner />로그인 상태를 확인하고 있어요</main>}><AuthenticatedWorkspace>{children}</AuthenticatedWorkspace></Suspense></div>;
}
