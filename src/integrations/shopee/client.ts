import { createHmac } from "node:crypto";

/**
 * Shopee Open Platform v2 (app "Rezekii", type Shopee Video Management). Server-only: uses the partner key.
 * SHOPEE_SANDBOX=1 uses Shopee's Sandbox V2 test servers (test shops only) until the app goes live.
 * Sign-in: https://open.shopee.com/developer-guide/20; Video sign-in roles: https://open.shopee.com/developer-guide/706.
 */
export type ShopeeRole = "seller" | "affiliate";

export function shopeeApp(): { partnerId: number; key: string; sandbox: boolean } {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID);
  const key = process.env.SHOPEE_PARTNER_KEY;
  if (!partnerId || !key) throw new Error("SHOPEE_PARTNER_ID and SHOPEE_PARTNER_KEY must be set");
  return { partnerId, key, sandbox: process.env.SHOPEE_SANDBOX === "1" };
}

const apiHost = (sandbox: boolean) => (sandbox ? "https://openplatform.sandbox.test-stable.shopee.sg" : "https://partner.shopeemobile.com");
const authPage = (sandbox: boolean) => (sandbox ? "https://open.sandbox.test-stable.shopee.com/auth" : "https://open.shopee.com/auth");

/** HMAC-SHA256 of partner_id + path + timestamp (+ access_token + shop_id or user_id), lowercase hex, keyed with the partner key. */
export const shopeeSign = (key: string, ...parts: (string | number)[]) => createHmac("sha256", key).update(parts.join("")).digest("hex");

/** Shopee's error code (e.g. "error_auth", "invalid_acceess_token", "refresh_token_expired") and message. */
export class ShopeeError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
  /** The sign-in has ended or was withdrawn (refresh token used up or expired, access withdrawn, account banned): connect again. */
  get needsReconnect(): boolean {
    return /refresh_token|access_expired|no_linked|banned|invalid_ac+ess_token/i.test(this.code);
  }
}

/**
 * Shopee's sign-in page. Sellers sign in as their shop (auth_type=seller: shop_id and user_id), affiliates as themselves
 * (auth_type=user: user_id only). Video calls use the user_id either way.
 */
export function shopeeAuthUrl(role: ShopeeRole, redirectUri: string, state: string): string {
  const { partnerId, sandbox } = shopeeApp();
  const q = new URLSearchParams({ partner_id: String(partnerId), auth_type: role === "seller" ? "seller" : "user", redirect_uri: redirectUri, response_type: "code", state });
  return `${authPage(sandbox)}?${q}`;
}

async function call<T>(path: string, init: { query?: Record<string, string | number>; body?: Record<string, unknown>; signWith?: (string | number)[] } = {}): Promise<T> {
  const { partnerId, key, sandbox } = shopeeApp();
  const ts = Math.floor(Date.now() / 1000);
  const q = new URLSearchParams({ partner_id: String(partnerId), timestamp: String(ts), sign: shopeeSign(key, partnerId, path, ts, ...(init.signWith ?? [])) });
  for (const [k, v] of Object.entries(init.query ?? {})) q.set(k, String(v));
  const res = await fetch(`${apiHost(sandbox)}${path}?${q}`, init.body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(init.body) } : {});
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (data.error || !res.ok) throw new ShopeeError(data.message || `Shopee answered ${res.status}`, data.error || `http_${res.status}`);
  return data;
}

export type ShopeeTokens = { userId: string; shopId: string | null; accessToken: string; refreshToken: string; expiresIn: number };

/** expire_in is documented as seconds; the token/get sample shows a Unix time, so either is read as "seconds from now". */
const seconds = (n: number | undefined) => (!n ? 4 * 3600 : n > 1e9 ? Math.max(60, n - Math.floor(Date.now() / 1000)) : n);

/**
 * The code from the sign-in page for the first access and refresh tokens. A shop account also sends back its shop_id, a
 * seller's main account its main_account_id; the first shop signed in is used.
 */
export async function exchangeShopeeCode(code: string, from: { shopId?: string | null; mainAccountId?: string | null } = {}): Promise<ShopeeTokens> {
  const { partnerId } = shopeeApp();
  const r = await call<{ access_token: string; refresh_token: string; expire_in?: number; user_id_list?: number[]; shop_id_list?: number[] }>("/api/v2/auth/token/get", {
    body: { code, partner_id: partnerId, ...(from.shopId ? { shop_id: Number(from.shopId) } : from.mainAccountId ? { main_account_id: Number(from.mainAccountId) } : {}) },
  });
  const userId = r.user_id_list?.[0];
  const shop = r.shop_id_list?.[0] ?? (from.shopId ? Number(from.shopId) : undefined);
  if (!userId && !shop) throw new ShopeeError("Shopee didn't say which account signed in.", "no_account");
  return { userId: String(userId ?? shop), shopId: shop ? String(shop) : null, accessToken: r.access_token, refreshToken: r.refresh_token, expiresIn: seconds(r.expire_in) };
}

/** A new access token (4 hours) and refresh token (30 days); each refresh token works once. */
export async function refreshShopeeToken(refreshToken: string, who: { userId?: string | null; shopId?: string | null }): Promise<Omit<ShopeeTokens, "userId" | "shopId">> {
  const { partnerId } = shopeeApp();
  const id = who.shopId ? { shop_id: Number(who.shopId) } : { user_id: Number(who.userId) };
  const r = await call<{ access_token: string; refresh_token: string; expire_in?: number }>("/api/v2/auth/access_token/get", { body: { refresh_token: refreshToken, partner_id: partnerId, ...id } });
  return { accessToken: r.access_token, refreshToken: r.refresh_token, expiresIn: seconds(r.expire_in) };
}

/** A seller's shop name and logo (a Shop API, signed with the shop_id). */
export async function shopeeShopProfile(accessToken: string, shopId: string): Promise<{ name: string | null; logo: string | null }> {
  const r = await call<{ response?: { shop_name?: string; shop_logo?: string } }>("/api/v2/shop/get_profile", { query: { access_token: accessToken, shop_id: shopId }, signWith: [accessToken, shopId] });
  return { name: r.response?.shop_name || null, logo: r.response?.shop_logo || null };
}
