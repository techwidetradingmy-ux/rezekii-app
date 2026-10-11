import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({ subsets: ["latin"], weight: ["400", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Rezekii · TikTok creator platform",
  description: "Schedule your TikTok posts, see what sells, promote Techwide's TikTok Shop campaigns and level up from Bronze to Gold.",
  metadataBase: new URL("https://rezekii.com"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00874f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={albertSans.className}>{children}</body>
    </html>
  );
}
