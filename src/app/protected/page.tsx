import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Setup check page: confirms login + server-side JWT verification work.
// Replace once real authenticated pages exist.
async function CurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{data.claims.email} 로그인됨</p>
      <LogoutButton />
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">확인 중...</p>}>
        <CurrentUser />
      </Suspense>
    </main>
  );
}
