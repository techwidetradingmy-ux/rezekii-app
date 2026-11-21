import { NextResponse, type NextRequest } from "next/server";
import type { ShopeeRole } from "@/integrations/shopee/client.ts";
import { OAUTH_COOKIE_OPTIONS, appBase } from "../oauth.ts";

/** Anti-forgery cookie for Connect Shopee (10 minutes, only sent to /api/auth): "<role>:<state>". */
export const SHOPEE_COOKIE = "rz_oauth_shopee";
/** The return address; its domain must match the Redirect URL Domain set on the Shopee app (rezekii.com). */
export const shopeeCallbackUrl = (req: NextRequest) => `${appBase(req)}/api/auth/shopee/callback`;
export const isShopeeRole = (r: string | null | undefined): r is ShopeeRole => r === "seller" || r === "affiliate";

/** Back to New post with the result, e.g. ?channel=shopee&connect=ok (shown there as a message). */
export function backFromShopee(req: NextRequest, result: string): NextResponse {
  const res = NextResponse.redirect(`${appBase(req)}/app/new?channel=shopee&connect=${result}`);
  res.cookies.set(SHOPEE_COOKIE, "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
