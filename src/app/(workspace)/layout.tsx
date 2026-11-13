import localFont from "next/font/local";
import { WorkspaceShell } from "@/components/home/workspace-shell";

const suit = localFont({
  src: "../../../public/fonts/suit/SUIT-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-home-body",
});
const pretendard = localFont({
  src: "../../../public/fonts/pretendard/PretendardVariable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-card-body",
  preload: false,
});
const katibeh = localFont({ src: "../../../public/fonts/katibeh/Katibeh-Regular.ttf", weight: "400", display: "swap", variable: "--font-card-display", preload: false });
const hand = localFont({ src: "../../../public/fonts/just-another-hand/JustAnotherHand-Regular.ttf", weight: "400", display: "swap", variable: "--font-card-hand", preload: false });

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={`home-theme min-h-svh ${suit.variable} ${pretendard.variable} ${katibeh.variable} ${hand.variable}`}><WorkspaceShell>{children}</WorkspaceShell></div>;
}
