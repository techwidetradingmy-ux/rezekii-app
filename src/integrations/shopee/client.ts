import { createHmac } from "node:crypto";
import { fetch as proxiedFetch, ProxyAgent } from "undici";

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

/**
 * Shopee wants the fixed IPs that call it declared (Other IT assets). With SHOPEE_PROXY_URL (http://user:pass@host:port)
 * every Shopee call goes out through that server, so Shopee always sees its address; without it, calls go out directly.
 */
let proxy: { url: string; agent: ProxyAgent } | null = null;
export async function shopeeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const via = process.env.SHOPEE_PROXY_URL;
  if (!via) return fetch(url, init);
  if (proxy?.url !== via) proxy = { url: via, agent: new ProxyAgent(via) };
  return (await proxiedFetch(url, { ...init, dispatcher: proxy.agent } as Parameters<typeof proxiedFetch>[1])) as unknown as Response;
}

/** One Shopee call: JSON `body` or a multipart `form` is a POST, otherwise a GET. `signWith` adds the token and account id to the sign. */
export async function shopeeCall<T>(path: string, init: { query?: Record<string, string | number>; body?: Record<string, unknown>; form?: { data: Buffer; type: string }; signWith?: (string | number)[] } = {}): Promise<T> {
  const { partnerId, key, sandbox } = shopeeApp();
  const ts = Math.floor(Date.now() / 1000);
  const q = new URLSearchParams({ partner_id: String(partnerId), timestamp: String(ts), sign: shopeeSign(key, partnerId, path, ts, ...(init.signWith ?? [])) });
  for (const [k, v] of Object.entries(init.query ?? {})) q.set(k, String(v));
  const req: RequestInit = init.form ? { method: "POST", headers: { "content-type": init.form.type }, body: new Uint8Array(init.form.data) }
    : init.body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(init.body) } : {};
  const res = await shopeeFetch(`${apiHost(sandbox)}${path}?${q}`, req);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (data.error || !res.ok) throw new ShopeeError(data.message || `Shopee answered ${res.status}`, data.error || `http_${res.status}`);
  return data;
}

export type ShopeeTokens = { userId: string; shopId: string | null; accessToken: string; refreshToken: string; expiresIn: number };

/** expire_in is documented as seconds; the token/get sample shows a Unix time, so either is read as "seconds from now". */
const seconds = (n: number | undefined) => (!n ? 4 * 3600 : n > 1e9 ? Math.max(60, n - Math.floor(Date.now() / 1000)) : n);

/**
 * The code from the sign-in page for the first access and refresh tokens. Only the code is sent (Video guide 706 →
 * Livestream guide 669): sending a seller's shop_id too gives a shop-only sign-in that Video calls refuse. A seller gets
 * back its shop_id and user_id (in the same order), an affiliate only its user_id.
 */
export async function exchangeShopeeCode(code: string): Promise<ShopeeTokens> {
  const { partnerId } = shopeeApp();
  const r = await shopeeCall<{ access_token: string; refresh_token: string; expire_in?: number; user_id_list?: number[]; shop_id_list?: number[] }>("/api/v2/auth/token/get", {
    body: { code, partner_id: partnerId },
  });
  const userId = r.user_id_list?.[0];
  const shop = r.shop_id_list?.[0];
  if (!userId) throw new ShopeeError("Shopee didn't say which account signed in.", "no_account");
  return { userId: String(userId), shopId: shop ? String(shop) : null, accessToken: r.access_token, refreshToken: r.refresh_token, expiresIn: seconds(r.expire_in) };
}

/** A new access token (4 hours) and refresh token (30 days), by user_id: Video calls are made as the user, seller or affiliate. */
export async function refreshShopeeToken(refreshToken: string, userId: string): Promise<Omit<ShopeeTokens, "userId" | "shopId">> {
  const { partnerId } = shopeeApp();
  const r = await shopeeCall<{ access_token: string; refresh_token: string; expire_in?: number }>("/api/v2/auth/access_token/get", { body: { refresh_token: refreshToken, partner_id: partnerId, user_id: Number(userId) } });
  return { accessToken: r.access_token, refreshToken: r.refresh_token, expiresIn: seconds(r.expire_in) };
}

/** A seller's shop name and logo (a Shop API, signed with the shop_id). */
export async function shopeeShopProfile(accessToken: string, shopId: string): Promise<{ name: string | null; logo: string | null }> {
  const r = await shopeeCall<{ response?: { shop_name?: string; shop_logo?: string } }>("/api/v2/shop/get_profile", { query: { access_token: accessToken, shop_id: shopId }, signWith: [accessToken, shopId] });
  return { name: r.response?.shop_name || null, logo: r.response?.shop_logo || null };
}
