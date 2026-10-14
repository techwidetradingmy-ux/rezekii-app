import { after, NextResponse, type NextRequest } from "next/server";
import { exchangeAuthCode } from "@/integrations/tiktok-shop/auth.ts";
import { getCreatorProfile } from "@/integrations/tiktok-shop/creator.ts";
import { getCategoryAssets } from "@/integrations/tiktok-shop/partner.ts";
import { getAuthorizedShops } from "@/integrations/tiktok-shop/seller.ts";
import type { TokenSet } from "@/integrations/tiktok-shop/auth.ts";
import { isAllowedPartnerDuringProof, savePartnerConnection } from "@/modules/marketplace/partner-connection.ts";
import { isAllowedSellerDuringProof, saveSellerConnection } from "@/modules/marketplace/seller-connection.ts";
import { SESSION_COOKIE, userForSession } from "@/modules/accounts/session.ts";
import { linkCreator } from "@/modules/creator-accounts/access.ts";
import { syncCreatorOrders } from "@/modules/sales/orders.ts";
import { tagTask } from "@/modules/accounts/tags.ts";
import { mytDay } from "@/modules/refresh/plan.ts";
import { addTasks } from "@/modules/refresh/store.ts";
import { STATE_COOKIE, STATE_COOKIE_OPTIONS, stateMatches } from "../state.ts";

// Linking also reads the creator's orders in the background, so Sales shows their GMV on the first visit.
export const maxDuration = 60;

const CREATOR_RESULTS = new Set(["connected", "waiting", "waitlist", "taken", "denied", "expired", "error"]);

/** TikTok Shop returns here after the creator approves (the one registered return address). */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // A creator goes back to Getting set up with the result; Techwide's partner and shop logins keep the /connected page.
  const finish = async (result: string) => {
    const user = CREATOR_RESULTS.has(result) ? await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null) : null;
    const to = user && user.role !== "admin" ? `/onboarding?result=${result}` : `/connected?result=${result}`;
    const res = NextResponse.redirect(new URL(to, req.nextUrl));
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
    if (tokens.user_type === 0) return finish(await connectSeller(tokens));

    const profileReply = await getCreatorProfile(tokens.access_token);
    if (profileReply.code !== 0 || !profileReply.data) {
      console.error("[tiktokshop] profile failed", profileReply.code, profileReply.message, profileReply.request_id);
      return finish("error");
    }
    const profile = profileReply.data;
    const openId = profile.creator_user_open_id || tokens.open_id;
    if (!openId) {
      console.error("[tiktokshop] no creator id in profile or token reply");
      return finish("error");
    }
    // A creator links TikTok Shop to the Rezekii account they are signed in to; Techwide then approves it (see creator access).
    const user = await userForSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
    if (!user) return finish("signin");
    const linked = await linkCreator(user, { openId, username: profile.username, avatarUrl: profile.avatar?.url }, tokens);
    if (linked === "connected")
      after(() => syncCreatorOrders(user.id, tokens.access_token, Date.now() + 50_000).catch((err) => console.error("[tiktokshop] first order read", err instanceof Error ? err.message : err)));
    // Agency status and TikTok level, found by the refresh queue within minutes of linking (owner, 14 Oct 2026).
    if (linked === "connected" || linked === "waiting") after(() => addTasks(mytDay(Date.now()), [tagTask(user.id)]).catch((err) => console.error("[tiktokshop] labels", err instanceof Error ? err.message : err)));
    return finish(linked);
  } catch (err) {
    console.error("[tiktokshop] callback error", err instanceof Error ? err.message : err);
    return finish("error");
  }
}

/** Partner Center login (Techwide, for TAP campaigns). Returns the /connected result. */
async function connectPartner(tokens: TokenSet): Promise<string> {
  const name = tokens.seller_name || "Partner account";
  if (!tokens.open_id) {
    console.error("[tiktokshop] partner token has no open_id");
    return "error";
  }
  if (!isAllowedPartnerDuringProof(tokens.open_id)) return "partner-not-allowed&id=" + encodeURIComponent(tokens.open_id);
  const assets = await getCategoryAssets(tokens.access_token);
  if (assets.code !== 0) console.error("[tiktokshop] category assets failed", assets.code, assets.message, assets.request_id);
  await savePartnerConnection({ openId: tokens.open_id, name, assets: assets.data?.category_assets }, tokens);
  return "partner-connected";
}

/** Seller Center login (a seller shop such as Zemvello Wellness, for marketplace creator data). Returns the /connected result. */
async function connectSeller(tokens: TokenSet): Promise<string> {
  const reply = await getAuthorizedShops(tokens.access_token);
  const shops = reply.data?.shops ?? [];
  if (reply.code !== 0 || !shops.length) {
    console.error("[tiktokshop] authorized shops failed", reply.code, reply.message, reply.request_id);
    return "error";
  }
  const allowed = shops.filter((s) => isAllowedSellerDuringProof(s.name));
  if (!allowed.length) return "seller-not-allowed&id=" + encodeURIComponent(shops.map((s) => s.name).join(", "));
  for (const shop of allowed) await saveSellerConnection(shop, tokens);
  return "seller-connected";
}
