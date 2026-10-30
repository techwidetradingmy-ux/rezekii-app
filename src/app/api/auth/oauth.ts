import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/modules/accounts/session.ts";

export type Provider = "google" | "tiktok";

/** Short-lived anti-forgery cookie per provider (10 minutes, only sent to /api/auth). */
export const oauthCookie = (p: Provider) => `rz_oauth_${p}`;
export const OAUTH_COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth", maxAge: 10 * 60 };

/** The site's canonical address (APP_URL, e.g. https://rezekii.com); falls back to the request's own origin in development. */
export const appBase = (req: NextRequest) => process.env.APP_URL ?? req.nextUrl.origin;
export const callbackUrl = (req: NextRequest, p: Provider) => `${appBase(req)}/api/auth/${p}/callback`;

/** Sign-in must start on the canonical host, or the anti-forgery cookie won't be there when the provider sends the user back. */
export function canonicalRedirect(req: NextRequest): NextResponse | null {
  const base = new URL(appBase(req));
  if (req.nextUrl.host === base.host) return null;
  return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, base));
}

export function toSignin(req: NextRequest, error: "denied" | "expired" | "failed" | "config" | "taken", p?: Provider): NextResponse {
  const res = NextResponse.redirect(`${appBase(req)}/signin?error=${error}`);
  if (p) res.cookies.set(oauthCookie(p), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}

/** Starts a session for the account and sends them into the app. */
export async function signedIn(req: NextRequest, userId: string, p: Provider, to = "/app"): Promise<NextResponse> {
  const { token, expires } = await createSession(userId);
  const res = NextResponse.redirect(`${appBase(req)}${to}`);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  res.cookies.set(oauthCookie(p), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
