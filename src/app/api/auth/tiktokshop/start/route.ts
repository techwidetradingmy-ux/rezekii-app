import { NextResponse, type NextRequest } from "next/server";
import { creatorAuthUrl, partnerAuthUrl } from "@/integrations/tiktok-shop/auth.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, newState } from "../state.ts";

export const dynamic = "force-dynamic";

/** Sends a creator (default) or, with ?as=partner, Techwide's Partner Center account to TikTok Shop to approve Rezekii. */
export async function GET(req: NextRequest) {
  const state = newState();
  const asPartner = req.nextUrl.searchParams.get("as") === "partner";
  const res = NextResponse.redirect(asPartner ? partnerAuthUrl(state) : creatorAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
  return res;
}
