import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/modules/accounts/session.ts";
import { attachReferral, readRefCookie, REF_COOKIE } from "@/modules/rewards/referrals.ts";
import { needsDetails } from "@/modules/rewards/profiles.ts";

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

/** Where to go after signing in, kept while the provider's page is open (owner, 31 Oct 2026: sellers return to their onboarding). */
export const NEXT_COOKIE = "rz_next";
export const nextPath = (v: string | null | undefined) => (v && /^\/seller(\/[a-z/-]*)?$/.test(v) ? v : null);
/** Keeps ?next= (seller pages only) for after the provider's sign-in. */
export function keepNext(req: NextRequest, res: NextResponse): void {
  const next = nextPath(req.nextUrl.searchParams.get("next"));
  if (next) res.cookies.set(NEXT_COOKIE, next, { ...OAUTH_COOKIE_OPTIONS });
}

/** Starts a session for the account and sends them into the app. A new account joins whoever invited it. */
export async function signedIn(req: NextRequest, userId: string, p: Provider, to = "/app"): Promise<NextResponse> {
  const { token, expires } = await createSession(userId);
  const next = nextPath(req.cookies.get(NEXT_COOKIE)?.value);
  if (next) to = next;
  // Details not filled in yet (Google and TikTok skip the sign-up form): the same form, once, before the app (owner, 31 Oct 2026).
  const details = to === "/app" && (await needsDetails(userId).catch(() => false));
  const res = NextResponse.redirect(`${appBase(req)}${details ? "/signin?details=1" : to}`);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  res.cookies.set(oauthCookie(p), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  if (next) res.cookies.set(NEXT_COOKIE, "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  await joinInviter(req, res, userId);
  return res;
}

/** Links a brand-new account to the invite it came with (link or typed code), then forgets the invite. */
export async function joinInviter(req: NextRequest, res: NextResponse, userId: string): Promise<void> {
  const ref = readRefCookie(req.cookies.get(REF_COOKIE)?.value);
  if (!ref) return;
  await attachReferral(userId, ref).catch((err) => console.error("[referral] attach", err instanceof Error ? err.message : err));
  res.cookies.set(REF_COOKIE, "", { path: "/", maxAge: 0 });
}
