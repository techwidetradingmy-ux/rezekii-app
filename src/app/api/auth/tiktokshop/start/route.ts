import { NextResponse } from "next/server";
import { creatorAuthUrl } from "@/integrations/tiktok-shop/auth.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, newState } from "../state.ts";

export const dynamic = "force-dynamic";

/** Sends the creator to TikTok Shop to approve Rezekii. */
export async function GET() {
  const state = newState();
  const res = NextResponse.redirect(creatorAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
  return res;
}
