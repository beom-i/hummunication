import localFont from "next/font/local";
import { WorkspaceShell } from "@/components/home/workspace-shell";

const suit = localFont({
  src: "../../../public/fonts/suit/SUIT-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-home-body",
});

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={`home-theme min-h-svh ${suit.variable}`}><WorkspaceShell>{children}</WorkspaceShell></div>;
}
