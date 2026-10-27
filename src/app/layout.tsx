import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import { DemoProvider } from "@/components/demo";
import "./globals.css";
import "./v2.css";

const albertSans = Albert_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "Rezekii 2.0 preview",
  description: "Rezekii 2.0 with sample data: creator, seller and admin apps.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00874f", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={albertSans.className}>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
