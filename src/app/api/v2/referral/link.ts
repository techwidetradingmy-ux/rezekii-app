import { NextResponse, type NextRequest } from "next/server";
import { cleanCode, ownerOf, REF_COOKIE, type RefCookie, type Side } from "@/modules/rewards/referrals.ts";
import { REFERRAL_DAYS } from "@/modules/rewards/rules.ts";

export const refCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: REFERRAL_DAYS * 86400 };

/**
 * Follows an invite link: keeps a real code in a cookie for sign-up, then opens the landing page (owner, 31 Oct 2026), the
 * creators' or the sellers'. Signing up from there, any way, still counts the invite.
 */
export async function refLink(req: NextRequest, ctx: { params: Promise<{ code: string }> }, side: Side): Promise<NextResponse> {
  const code = cleanCode((await ctx.params).code);
  const ok = code && (await ownerOf(code).catch(() => null));
  const res = NextResponse.redirect(new URL(side === "seller" ? "/seller" : "/", req.nextUrl.origin));
  if (ok) res.cookies.set(REF_COOKIE, JSON.stringify({ c: code, s: side, v: "link", t: Date.now() } satisfies RefCookie), refCookieOptions);
  return res;
}
