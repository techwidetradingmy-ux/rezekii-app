import type { NextRequest } from "next/server";
import { exchangeTikTokCode, getTikTokUser, type TikTokTokens } from "@/integrations/tiktok/login.ts";
import { SESSION_COOKIE, userForSession } from "@/modules/accounts/session.ts";
import { linkOrSignInTikTok, saveTikTokConnection } from "@/modules/accounts/users.ts";
import { stateMatches } from "../../tiktokshop/state.ts";
import { callbackUrl, oauthCookie, signedIn, toSignin } from "../../oauth.ts";

export const dynamic = "force-dynamic";

/** TikTok sends the user back here (the redirect URI registered in the TikTok for Developers app). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) {
    console.error("[tiktok] authorize error", q.get("error"), q.get("error_description"));
    return toSignin(req, "denied", "tiktok");
  }
  const code = q.get("code");
  if (!code) return toSignin(req, "failed", "tiktok");
  if (!stateMatches(q.get("state"), req.cookies.get(oauthCookie("tiktok"))?.value)) return toSignin(req, "expired", "tiktok");
  try {
    const reply = await exchangeTikTokCode(code, callbackUrl(req, "tiktok"));
    if (!reply.access_token || !reply.open_id || !reply.refresh_token) {
      console.error("[tiktok] token exchange failed", reply.error, reply.error_description, reply.log_id);
      return toSignin(req, "failed", "tiktok");
    }
    const tokens = reply as TikTokTokens;
    const info = await getTikTokUser(tokens.access_token);
    if (info.error) console.error("[tiktok] user info failed", info.error.code, info.error.message);
    const profile = { open_id: tokens.open_id, union_id: info.user?.union_id, username: info.user?.username, display_name: info.user?.display_name, avatar_url: info.user?.avatar_url };
    // Already signed in (Connect TikTok on Account): connect it to that account and go back there.
    const current = await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    const result = await linkOrSignInTikTok(current, profile);
    if ("taken" in result) return toSignin(req, "taken", "tiktok");
    const { user, linked } = result;
    await saveTikTokConnection(user.id, profile, tokens);
    return signedIn(req, user.id, "tiktok", !linked ? "/app" : "/app/accounts?connected=tiktok");
  } catch (err) {
    console.error("[tiktok] callback error", err instanceof Error ? err.message : err);
    return toSignin(req, "failed", "tiktok");
  }
}
