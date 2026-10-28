import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { exchangeShopeeCode, shopeeShopProfile } from "@/integrations/shopee/client.ts";
import { saveShopee } from "@/modules/shopee/connections.ts";
import { stateMatches } from "../../tiktokshop/state.ts";
import { appBase } from "../../oauth.ts";
import { SHOPEE_COOKIE, backFromShopee, isShopeeRole } from "../shopee.ts";

export const dynamic = "force-dynamic";

/** Shopee sends the person back here after its sign-in page, with a code (and shop_id or main_account_id for a seller). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const code = q.get("code");
  if (!code) return backFromShopee(req, "cancelled");
  const [role, state] = (req.cookies.get(SHOPEE_COOKIE)?.value ?? "").split(":");
  if (!isShopeeRole(role) || !stateMatches(q.get("state"), state)) return backFromShopee(req, "expired");
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  try {
    const t = await exchangeShopeeCode(code, { shopId: q.get("shop_id"), mainAccountId: q.get("main_account_id") });
    // A seller's shop name and logo; an affiliate's account has no profile call, so it shows as "Shopee affiliate".
    const shop = t.shopId ? await shopeeShopProfile(t.accessToken, t.shopId).catch(() => null) : null;
    await saveShopee(user.id, { role: t.shopId ? "seller" : role, userId: t.userId, shopId: t.shopId, name: shop?.name ?? null, avatarUrl: shop?.logo ?? null, accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn });
    return backFromShopee(req, "ok");
  } catch (err) {
    console.error("[shopee] callback failed", err instanceof Error ? err.message : err);
    return backFromShopee(req, "failed");
  }
}
