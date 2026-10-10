export const API_BASE = "https://open-api.tiktokglobalshop.com";
export const AUTH_BASE = "https://auth.tiktok-shops.com";
export const CREATOR_AUTH_URL = "https://shop.tiktok.com/alliance/creator/auth";
export const PARTNER_AUTH_URL = "https://partner.tiktokshop.com/open/authorize";
/** Rezekii's Partner Center service ID (public identifier, like the app key). */
export const SERVICE_ID = process.env.TIKTOK_SHOP_SERVICE_ID ?? "7634095739546650375";

export function appCredentials(): { appKey: string; appSecret: string } {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("TIKTOK_SHOP_APP_KEY and TIKTOK_SHOP_APP_SECRET must be set");
  }
  return { appKey, appSecret };
}
