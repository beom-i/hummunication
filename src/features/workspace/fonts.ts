import localFont from "next/font/local";

export const workspaceFont = localFont({
  src: "../../../public/fonts/suit/SUIT-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-home-body",
});
