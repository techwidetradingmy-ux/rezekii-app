import { refreshTokens } from "../../integrations/tiktok-shop/auth.ts";
import { getCategoryAssets, tapAsset } from "../../integrations/tiktok-shop/partner.ts";
import { getPartnerConnection, savePartnerConnection } from "../marketplace/partner-connection.ts";
import { getSellerConnection, saveSellerConnection } from "../marketplace/seller-connection.ts";

export type Session = { token: string; cipher: string };
/** Where the refresh gets its TikTok Shop access. Each is asked for only when a task needs it. */
export type Sessions = { seller: () => Promise<Session>; partner: () => Promise<Session> };

const soon = (d: Date) => d.getTime() < Date.now() + 10 * 60 * 1000;

/** Seller access (best-seller lists, Creator Marketplace) from the connected shop, renewed when it expires within 10 minutes. */
async function sellerSession(): Promise<Session> {
  const conn = await getSellerConnection();
  if (!conn) throw new Error("No seller shop is connected (needed for best-seller lists and the Creator Marketplace).");
  let token = conn.accessToken;
  if (soon(conn.accessExpiresAt)) {
    const r = await refreshTokens(conn.refreshToken);
    if (r.code !== 0 || !r.data) throw new Error(`Seller token renewal failed: ${r.code} ${r.message}`);
    await saveSellerConnection(conn.shop, r.data);
    token = r.data.access_token;
  }
  return { token, cipher: conn.shop.cipher };
}

/** Techwide's partner access (TAP campaigns) with the Malaysia TAP category cipher. */
async function partnerSession(): Promise<Session> {
  const conn = await getPartnerConnection();
  if (!conn) throw new Error("Techwide's Partner Center account is not connected (needed for TAP products).");
  let token = conn.accessToken;
  if (soon(conn.accessExpiresAt)) {
    const r = await refreshTokens(conn.refreshToken);
    if (r.code !== 0 || !r.data) throw new Error(`Partner token renewal failed: ${r.code} ${r.message}`);
    await savePartnerConnection({ openId: conn.openId, name: conn.name, assets: conn.assets }, r.data);
    token = r.data.access_token;
  }
  let assets = conn.assets;
  if (!assets.length) {
    const a = await getCategoryAssets(token);
    if (a.code !== 0) throw new Error(`Get Authorized Category Assets failed: ${a.code} ${a.message}`);
    assets = a.data?.category_assets ?? [];
  }
  const pick = tapAsset(assets);
  if (!pick) throw new Error("The partner's TAP category for Malaysia is not authorized.");
  return { token, cipher: pick.cipher };
}

/** Sessions from this environment's stored connections, each loaded once per run. */
export function storedSessions(): Sessions {
  let seller: Promise<Session> | undefined;
  let partner: Promise<Session> | undefined;
  return {
    seller: () => (seller ??= sellerSession()),
    partner: () => (partner ??= partnerSession()),
  };
}
