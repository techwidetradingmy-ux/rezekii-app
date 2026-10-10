export const API_BASE = "https://open-api.tiktokglobalshop.com";
export const AUTH_BASE = "https://auth.tiktok-shops.com";
export const CREATOR_AUTH_URL = "https://shop.tiktok.com/alliance/creator/auth";

export function appCredentials(): { appKey: string; appSecret: string } {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("TIKTOK_SHOP_APP_KEY and TIKTOK_SHOP_APP_SECRET must be set");
  }
  return { appKey, appSecret };
}
