import { NextResponse, type NextRequest } from "next/server";
import { creatorAuthUrl, partnerAuthUrl, sellerAuthUrl } from "@/integrations/tiktok-shop/auth.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, newState } from "../state.ts";

export const dynamic = "force-dynamic";

/** Sends a creator (default), Techwide's Partner Center account (?as=partner) or a seller shop (?as=seller) to TikTok Shop to approve Rezekii. */
export async function GET(req: NextRequest) {
  const state = newState();
  const as = req.nextUrl.searchParams.get("as");
  const res = NextResponse.redirect(as === "partner" ? partnerAuthUrl(state) : as === "seller" ? sellerAuthUrl(state) : creatorAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
  return res;
}
