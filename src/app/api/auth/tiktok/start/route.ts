import { NextResponse, type NextRequest } from "next/server";
import { tiktokAuthUrl } from "@/integrations/tiktok/login.ts";
import { newState } from "../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, callbackUrl, canonicalRedirect, oauthCookie, toSignin } from "../../oauth.ts";

export const dynamic = "force-dynamic";

/** "Continue with TikTok": TikTok for Developers Login Kit (not TikTok Shop linking). */
export async function GET(req: NextRequest) {
  const moved = canonicalRedirect(req);
  if (moved) return moved;
  const state = newState();
  let url: string;
  try {
    url = tiktokAuthUrl(state, callbackUrl(req, "tiktok"));
  } catch (err) {
    console.error("[tiktok] not configured", err instanceof Error ? err.message : err);
    return toSignin(req, "config");
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(oauthCookie("tiktok"), state, OAUTH_COOKIE_OPTIONS);
  return res;
}
