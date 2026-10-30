import type { NextRequest } from "next/server";
import { exchangeGoogleCode, getGoogleUser } from "@/integrations/google/oauth.ts";
import { upsertGoogleUser } from "@/modules/accounts/users.ts";
import { stateMatches } from "../../tiktokshop/state.ts";
import { callbackUrl, oauthCookie, signedIn, toSignin } from "../../oauth.ts";

export const dynamic = "force-dynamic";

/** Google sends the user back here after they pick an account. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return toSignin(req, "denied", "google");
  const code = q.get("code");
  if (!code) return toSignin(req, "failed", "google");
  if (!stateMatches(q.get("state"), req.cookies.get(oauthCookie("google"))?.value)) return toSignin(req, "expired", "google");
  try {
    const tokens = await exchangeGoogleCode(code, callbackUrl(req, "google"));
    if (!tokens.access_token) {
      console.error("[google] token exchange failed", tokens.error, tokens.error_description);
      return toSignin(req, "failed", "google");
    }
    const profile = await getGoogleUser(tokens.access_token);
    if (!profile?.sub) return toSignin(req, "failed", "google");
    const user = await upsertGoogleUser(profile);
    return signedIn(req, user.id, "google");
  } catch (err) {
    console.error("[google] callback error", err instanceof Error ? err.message : err);
    return toSignin(req, "failed", "google");
  }
}
