import localFont from "next/font/local";

const suit = localFont({
  src: "../../../public/fonts/suit/SUIT-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-home-body",
});

export default function HomeLayout({ children }: LayoutProps<"/home">) {
  return <div className={`home-theme min-h-svh ${suit.variable}`}>{children}</div>;
}
