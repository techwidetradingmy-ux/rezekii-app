import { NextResponse, type NextRequest } from "next/server";

/**
 * During the beta, Rezekii V2 lives at beta.rezekii.com (owner, 2 Nov 2026). The old rezekii-v2-preview.vercel.app address
 * keeps working: its pages and sign-in steps move over to APP_URL, including TikTok Shop's return from rezekii.com, so the
 * sign-in cookies are found. The timers and other API calls stay where they are.
 */
const OLD_HOST = "rezekii-v2-preview.vercel.app";

export function proxy(req: NextRequest) {
  const base = process.env.APP_URL;
  if (!base || req.nextUrl.host !== OLD_HOST || new URL(base).host === OLD_HOST) return;
  if (req.method !== "GET" && req.method !== "HEAD") return;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) return;
  return NextResponse.redirect(new URL(path + req.nextUrl.search, base), 307);
}

export const config = { matcher: ["/((?!_next/).*)"] };
