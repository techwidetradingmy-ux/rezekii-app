import { NextResponse, type NextRequest } from "next/server";
import { exchangeAuthCode } from "@/integrations/tiktok-shop/auth.ts";
import { getCreatorProfile } from "@/integrations/tiktok-shop/creator.ts";
import { getCategoryAssets } from "@/integrations/tiktok-shop/partner.ts";
import type { TokenSet } from "@/integrations/tiktok-shop/auth.ts";
import { isAllowedPartnerDuringProof, savePartnerConnection } from "@/modules/marketplace/partner-connection.ts";
import { isAllowedDuringProof, saveAffiliateConnection } from "@/modules/creator-accounts/affiliate-connections.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, stateMatches } from "../state.ts";

/** TikTok Shop returns here after the creator approves (the one registered return address). */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const finish = (result: string) => {
    const res = NextResponse.redirect(new URL(`/connected?result=${result}`, req.nextUrl));
    res.cookies.set(STATE_COOKIE, "", { ...STATE_COOKIE_OPTIONS, maxAge: 0 });
    return res;
  };

  if (params.get("error")) return finish("denied");
  const code = params.get("code") ?? params.get("auth_code");
  if (!code) return finish("error");
  if (!stateMatches(params.get("state"), req.cookies.get(STATE_COOKIE)?.value)) return finish("expired");

  try {
    const tokenReply = await exchangeAuthCode(code);
    if (tokenReply.code !== 0 || !tokenReply.data) {
      console.error("[tiktokshop] token exchange failed", tokenReply.code, tokenReply.message, tokenReply.request_id);
      return finish("error");
    }
    const tokens = tokenReply.data;
    if (tokens.user_type === 3) return finish(await connectPartner(tokens));

    const profileReply = await getCreatorProfile(tokens.access_token);
    if (profileReply.code !== 0 || !profileReply.data) {
      console.error("[tiktokshop] profile failed", profileReply.code, profileReply.message, profileReply.request_id);
      return finish("error");
    }
    const profile = profileReply.data;

    // v0.1 proof: any account outside the allow-list is discarded, never stored.
    if (!isAllowedDuringProof(profile.username)) return finish("not-allowed");

    const openId = profile.creator_user_open_id || tokens.open_id;
    if (!openId) {
      console.error("[tiktokshop] no creator id in profile or token reply");
      return finish("error");
    }

    await saveAffiliateConnection(
      {
        openId,
        username: profile.username,
        avatarUrl: profile.avatar?.url,
      },
      tokens,
    );
    return finish("connected");
  } catch (err) {
    console.error("[tiktokshop] callback error", err instanceof Error ? err.message : err);
    return finish("error");
  }
}

/** Partner Center login (Techwide, for TAP campaigns). Returns the /connected result. */
async function connectPartner(tokens: TokenSet): Promise<string> {
  const name = tokens.seller_name || "Partner account";
  if (!isAllowedPartnerDuringProof(name)) return "partner-not-allowed&name=" + encodeURIComponent(name);
  if (!tokens.open_id) {
    console.error("[tiktokshop] partner token has no open_id");
    return "error";
  }
  const assets = await getCategoryAssets(tokens.access_token);
  if (assets.code !== 0) console.error("[tiktokshop] category assets failed", assets.code, assets.message, assets.request_id);
  await savePartnerConnection({ openId: tokens.open_id, name, assets: assets.data?.category_assets }, tokens);
  return "partner-connected";
}
