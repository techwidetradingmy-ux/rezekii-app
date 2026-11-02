import { NextResponse, type NextRequest } from "next/server";
import { creatorAuthUrl, partnerAuthUrl, sellerAuthUrl } from "@/integrations/tiktok-shop/auth.ts";
import { SESSION_COOKIE, userForSession } from "@/modules/accounts/session.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, newState } from "../state.ts";
import { betaApproved } from "@/modules/beta/access.ts";

export const dynamic = "force-dynamic";

/** Sends a creator (default), Techwide's Partner Center account (?as=partner) or a seller shop (?as=seller) to TikTok Shop to approve Rezekii. */
export async function GET(req: NextRequest) {
  const as = req.nextUrl.searchParams.get("as");
  // Creators link TikTok Shop to their own Rezekii account, so they sign in first.
  if (as !== "partner" && as !== "seller") {
    const user = await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    if (!user) return NextResponse.redirect(new URL("/signin?in=1", req.nextUrl));
    // Beta (owner, 2 Nov 2026): only creators Techwide has let in can link TikTok Shop; the others see where they stand.
    if (!(await betaApproved(user, "creator").catch(() => false))) return NextResponse.redirect(new URL("/app", req.nextUrl));
  }
  // rezekii.com holds TikTok Shop's one return address and passes "v2." (this site) or "v2l." (this computer) states on here.
  const state = `${req.nextUrl.hostname === "localhost" ? "v2l" : "v2"}.${newState()}`;
  const res = NextResponse.redirect(as === "partner" ? partnerAuthUrl(state) : as === "seller" ? sellerAuthUrl(state) : creatorAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
  return res;
}
