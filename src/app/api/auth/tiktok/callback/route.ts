import { after, NextResponse, type NextRequest } from "next/server";
import { syncMyVideos } from "@/modules/admin/videos.ts";
import { exchangeTikTokCode, getTikTokUser, type TikTokTokens } from "@/integrations/tiktok/login.ts";
import { SESSION_COOKIE, userForSession } from "@/modules/accounts/session.ts";
import { linkOrSignInTikTok, saveTikTokConnection } from "@/modules/accounts/users.ts";
import { stateMatches } from "../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, adding, appBase, callbackUrl, oauthCookie, signedIn, toSignin } from "../../oauth.ts";
import { linkedPage, passAtReturn } from "../../connect.ts";

export const dynamic = "force-dynamic";

/** TikTok sends the user back here (the redirect URI registered in the TikTok for Developers app). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) {
    console.error("[tiktok] authorize error", q.get("error"), q.get("error_description"));
    return backOrSignin(req, "denied");
  }
  const code = q.get("code");
  if (!code) return backOrSignin(req, "failed");
  if (!stateMatches(q.get("state"), req.cookies.get(oauthCookie("tiktok"))?.value)) return backOrSignin(req, "expired");
  try {
    const reply = await exchangeTikTokCode(code, callbackUrl(req, "tiktok"));
    if (!reply.access_token || !reply.open_id || !reply.refresh_token) {
      console.error("[tiktok] token exchange failed", reply.error, reply.error_description, reply.log_id);
      return backOrSignin(req, "failed");
    }
    const tokens = reply as TikTokTokens;
    const info = await getTikTokUser(tokens.access_token);
    if (info.error) console.error("[tiktok] user info failed", info.error.code, info.error.message);
    const profile = { open_id: tokens.open_id, union_id: info.user?.union_id, username: info.user?.username, display_name: info.user?.display_name, avatar_url: info.user?.avatar_url };
    // Already signed in (Connect TikTok on Account): connect it to that account and go back there. Add Account signs in to
    // this TikTok's own account instead (owner, 4 Nov 2026).
    // From the Home Screen app this browser isn't signed in; its pass says whose account (owner, 23 Nov 2026).
    const session = adding(req) ? null : await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    const pass = adding(req) || session ? null : await passAtReturn(req);
    const result = await linkOrSignInTikTok(session ?? pass, profile);
    if ("taken" in result) return pass ? linkedPage(req, "tiktok", false) : toSignin(req, "taken", "tiktok");
    const { user, linked } = result;
    await saveTikTokConnection(user.id, profile, tokens);
    after(() => syncMyVideos(user.id).catch((err) => console.error("[tiktok] first video read", err instanceof Error ? err.message : err)));
    // Connected for the Home Screen app: this browser stays signed out and says to go back to the app.
    if (pass) return linkedPage(req, "tiktok", true);
    return signedIn(req, user.id, "tiktok", !linked ? "/app" : "/app/account?channel=tiktok&connect=ok#connections");
  } catch (err) {
    console.error("[tiktok] callback error", err instanceof Error ? err.message : err);
    return backOrSignin(req, "failed");
  }
}

/**
 * Already signed in (Connect TikTok on Account): back to Connections, not the sign-in page (owner, 22 Nov 2026: TikTok sent its
 * reply twice; the second one found the check already used and looked like being signed out). An expired check says nothing:
 * Connections shows whether TikTok is connected.
 */
async function backOrSignin(req: NextRequest, error: "denied" | "failed" | "expired"): Promise<NextResponse> {
  const user = adding(req) ? null : await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!user && !adding(req) && (await passAtReturn(req))) return linkedPage(req, "tiktok", false);
  if (!user) return toSignin(req, error, "tiktok");
  const said = error === "expired" ? "" : `&connect=${error === "denied" ? "cancelled" : "failed"}`;
  const res = NextResponse.redirect(`${appBase(req)}/app/account?channel=tiktok${said}#connections`);
  res.cookies.set(oauthCookie("tiktok"), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
