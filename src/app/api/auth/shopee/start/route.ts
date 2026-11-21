import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { shopeeAuthUrl } from "@/integrations/shopee/client.ts";
import { newState } from "../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, appBase, canonicalRedirect } from "../../oauth.ts";
import { SHOPEE_COOKIE, backFromShopee, isShopeeRole, shopeeCallbackUrl } from "../shopee.ts";

export const dynamic = "force-dynamic";

/** Connect Shopee (?role=seller|affiliate): sends the signed-in account to Shopee's own sign-in page. */
export async function GET(req: NextRequest) {
  const moved = canonicalRedirect(req);
  if (moved) return moved;
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  const role = req.nextUrl.searchParams.get("role");
  if (!isShopeeRole(role)) return NextResponse.redirect(`${appBase(req)}/app/new`);
  const state = newState();
  let url: string;
  try {
    url = shopeeAuthUrl(role, shopeeCallbackUrl(req), state);
  } catch (err) {
    console.error("[shopee] not configured", err instanceof Error ? err.message : err);
    return backFromShopee(req, "config");
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(SHOPEE_COOKIE, `${role}:${state}`, OAUTH_COOKIE_OPTIONS);
  return res;
}
