import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const albertSans = Albert_Sans({ subsets: ["latin"], weight: ["400", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Rezekii · TikTok creator platform",
  description: "Schedule your TikTok posts, see what sells, promote Techwide's TikTok Shop campaigns and level up from Bronze to Gold.",
  metadataBase: new URL("https://rezekii.com"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00874f" };

const THEME_SCRIPT = `try{var t=localStorage.getItem("rz_theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={albertSans.className}>
        {/* Applies the Appearance choice from Account before the page paints (saved on this device only). */}
        <Script id="rz-theme" strategy="beforeInteractive">{THEME_SCRIPT}</Script>
        {children}
      </body>
    </html>
  );
}
