import { NextResponse, type NextRequest } from "next/server";
import { CONNECT_COOKIE, passAccount, readPass } from "@/modules/accounts/connect-pass.ts";
import type { AppUser } from "@/modules/accounts/users.ts";
import { OAUTH_COOKIE_OPTIONS, appBase } from "./oauth.ts";

/**
 * Connecting from the Home Screen app (see connect-pass.ts): the connect opens in the phone's browser with ?pass=, which is kept
 * while TikTok Shop's, TikTok's or Meta's page is open, and tells the return step whose account it is.
 */
export function keepPass(req: NextRequest, res: NextResponse): void {
  const pass = req.nextUrl.searchParams.get("pass");
  if (pass && readPass(pass)) res.cookies.set(CONNECT_COOKIE, pass, OAUTH_COOKIE_OPTIONS);
}

/** The account in the start step's ?pass=, or null. */
export const passAtStart = (req: NextRequest): Promise<AppUser | null> => passAccount(req.nextUrl.searchParams.get("pass")).catch(() => null);

/** The account in the kept pass, at the return step, or null. */
export const passAtReturn = (req: NextRequest): Promise<AppUser | null> => passAccount(req.cookies.get(CONNECT_COOKIE)?.value).catch(() => null);

export type ConnectApp = "tiktokshop" | "tiktok" | "facebook" | "instagram" | "threads";

/** Finished in the browser for the Home Screen app: a page that says to go back to the app (it shows the new link by itself). */
export function linkedPage(req: NextRequest, app: ConnectApp, ok: boolean): NextResponse {
  const res = NextResponse.redirect(`${appBase(req)}/linked?${new URLSearchParams({ app, ok: ok ? "1" : "0" })}`);
  res.cookies.set(CONNECT_COOKIE, "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
