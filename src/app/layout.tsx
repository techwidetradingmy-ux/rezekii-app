import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rezekii — Creator Affiliate Platform",
  description: "Earn commissions by promoting TikTok Shop products. Browse products, apply for free samples, post content, get paid.",
  metadataBase: new URL("https://rezekii.com"),
  openGraph: {
    title: "Rezekii",
    description: "TikTok Creator Affiliate Platform by Techwide Marketing",
    url: "https://rezekii.com",
    siteName: "Rezekii",
    locale: "en_MY",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00c073",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${albertSans.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: "var(--font-rz, var(--font-albert-sans), system-ui, sans-serif)" }}>
        {children}
      </body>
    </html>
  );
}
