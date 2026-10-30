import { NextResponse, type NextRequest } from "next/server";
import { cleanCode, ownerOf, REF_COOKIE, type RefCookie, type Side } from "@/modules/rewards/referrals.ts";
import { REFERRAL_DAYS } from "@/modules/rewards/rules.ts";

export const refCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: REFERRAL_DAYS * 86400 };

/** Follows an invite link: keeps a real code in a cookie for sign-up, then goes to the right sign-up page. */
export async function refLink(req: NextRequest, ctx: { params: Promise<{ code: string }> }, side: Side): Promise<NextResponse> {
  const code = cleanCode((await ctx.params).code);
  const to = new URL(side === "seller" ? "/seller" : "/signin", req.nextUrl.origin);
  const ok = code && (await ownerOf(code).catch(() => null));
  if (ok) to.searchParams.set("ref", code);
  const res = NextResponse.redirect(to);
  if (ok) res.cookies.set(REF_COOKIE, JSON.stringify({ c: code, s: side, v: "link", t: Date.now() } satisfies RefCookie), refCookieOptions);
  return res;
}
