import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import Script from "next/script";
import { DemoProvider } from "@/components/demo";
import { ConsentGate } from "@/components/consent";
import { WaGate } from "@/components/wa-gate";
import { LangProvider } from "@/lib/i18n/client";
import { htmlLang } from "@/lib/i18n/lang";
import { getLang } from "@/lib/i18n/server";
import { wordsFor } from "@/lib/i18n/translate";
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
const THEME_SCRIPT = `try{var p=location.pathname;if(p==="/"||p==="/seller"){document.documentElement.dataset.theme="light"}else{var t=localStorage.getItem("rz2_theme");if(t==="Light"||t==="Dark"){document.documentElement.dataset.theme=t.toLowerCase()}}if(p.indexOf("/app")===0||p.indexOf("/seller/app")===0||p.indexOf("/admin")===0){document.documentElement.dataset.wait="1"}}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // English, Malay or Chinese (owner, 3 Nov 2026), from this device's choice; the word list comes with the page.
  const lang = await getLang();
  return (
    <html lang={htmlLang(lang)} suppressHydrationWarning>
      <body className={albertSans.className}>
        <Script id="rz2-theme" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
        <LangProvider lang={lang} words={wordsFor(lang)}><DemoProvider>{children}<ConsentGate /><WaGate /></DemoProvider></LangProvider>
      </body>
    </html>
  );
}
