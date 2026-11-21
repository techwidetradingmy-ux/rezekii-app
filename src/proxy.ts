import { NextResponse, type NextRequest } from "next/server";

/**
 * Rezekii's older addresses keep working: their pages and sign-in steps move over to APP_URL, so the sign-in cookies are found.
 * The timers and other API calls stay where they are. rezekii-v2-preview.vercel.app was the first beta address; beta.rezekii.com
 * the beta itself (owner, 2 Nov 2026), until the new site became rezekii.com (owner, 21 Nov 2026: "we no longer need
 * beta.rezekii.com, just move everything to rezekii.com").
 */
const OLD_HOSTS = new Set(["rezekii-v2-preview.vercel.app", "beta.rezekii.com"]);

export function proxy(req: NextRequest) {
  const base = process.env.APP_URL;
  if (!base || !OLD_HOSTS.has(req.nextUrl.host) || new URL(base).host === req.nextUrl.host) return;
  if (req.method !== "GET" && req.method !== "HEAD") return;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) return;
  return NextResponse.redirect(new URL(path + req.nextUrl.search, base), 307);
}

export const config = { matcher: ["/((?!_next/).*)"] };
