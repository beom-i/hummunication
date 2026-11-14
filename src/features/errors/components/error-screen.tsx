"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceFont } from "@/features/workspace/fonts";
import "./error-screen.css";

/** Shared full-screen error view for not-found.tsx and error.tsx. `action` is the right-hand primary button. */
export function ErrorScreen({ code, title, body, action }: { code: string; title: string; body: string; action: React.ReactNode }) {
  const router = useRouter();
  // Direct visits have no history to go back to.
  const back = () => (window.history.length > 1 ? router.back() : router.push("/home"));

  return (
    <main className={`error-theme relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center ${workspaceFont.variable}`}>
      <div className="error-glow" aria-hidden="true" />
      <div className="error-grid" aria-hidden="true" />
      <div className="error-intro relative flex flex-col items-center">
        <p style={{ "--d": "0ms" } as React.CSSProperties} className="error-code font-extrabold tracking-[-0.06em]">{code}</p>
        <h1 style={{ "--d": "120ms" } as React.CSSProperties} className="error-title -mt-2 text-[clamp(26px,3.6vw,36px)] font-extrabold tracking-[-0.04em]">{title}</h1>
        <p style={{ "--d": "220ms" } as React.CSSProperties} className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">{body}</p>
        <div style={{ "--d": "320ms" } as React.CSSProperties} className="mt-10 flex gap-3">
          <Button variant="ghost" onClick={back} className="h-11 rounded-full border border-border px-5 hover:bg-secondary"><ArrowLeft />이전 페이지</Button>
          {action}
        </div>
      </div>
    </main>
  );
}
