import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import Script from "next/script";
import { DemoProvider } from "@/components/demo";
import { ConsentGate } from "@/components/consent";
import { WaGate } from "@/components/wa-gate";
import "./globals.css";
import "./v2.css";

const albertSans = Albert_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "Rezekii",
  description: "Rezekii: an AI-powered affiliate platform for TikTok Shop creators and sellers.",
  robots: { index: false, follow: false },
  // On an iPhone's home screen too: full screen, Rezekii's name and logo (owner, 2 Nov 2026).
  appleWebApp: { capable: true, title: "Rezekii", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00874f", viewportFit: "cover" };

/**
 * Applies the Light / Dark choice from Account before the page paints (saved on this device only). The landing pages are
 * always light (owner, 30 Oct 2026).
 */
const THEME_SCRIPT = `try{var p=location.pathname;if(p==="/"||p==="/seller"){document.documentElement.dataset.theme="light"}else{var t=localStorage.getItem("rz2_theme");if(t==="Light"||t==="Dark"){document.documentElement.dataset.theme=t.toLowerCase()}}if((localStorage.getItem("rz2_in")==="1"||document.cookie.indexOf("rz_in=1")>=0)&&(p.indexOf("/app")===0||p.indexOf("/seller/app")===0||p.indexOf("/admin")===0)){document.documentElement.dataset.wait="1"}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={albertSans.className}>
        <Script id="rz2-theme" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
        <DemoProvider>{children}<ConsentGate /><WaGate /></DemoProvider>
      </body>
    </html>
  );
}
