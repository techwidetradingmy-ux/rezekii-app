import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl } from "@/integrations/google/oauth.ts";
import { newState } from "../../tiktokshop/state.ts";
import { keepAdd, keepHandoff, keepNext, OAUTH_COOKIE_OPTIONS, callbackUrl, canonicalRedirect, oauthCookie, toSignin } from "../../oauth.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const moved = canonicalRedirect(req);
  if (moved) return moved;
  const state = newState();
  let url: string;
  try {
    url = googleAuthUrl(state, callbackUrl(req, "google"));
  } catch (err) {
    console.error("[google] not configured", err instanceof Error ? err.message : err);
    return toSignin(req, "config");
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(oauthCookie("google"), state, OAUTH_COOKIE_OPTIONS);
  keepNext(req, res);
  keepHandoff(req, res);
  keepAdd(req, res);
  return res;
}
