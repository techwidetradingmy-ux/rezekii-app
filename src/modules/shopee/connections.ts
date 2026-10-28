import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { refreshShopeeToken, ShopeeError, type ShopeeRole } from "../../integrations/shopee/client.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";

/** A connected Shopee account (a seller's shop or an affiliate). Tokens are stored encrypted and never leave the server. */
export type ShopeeConnection = {
  id: string;
  user_id: string;
  shopee_user_id: string;
  shop_id: string | null;
  role: ShopeeRole;
  name: string | null;
  avatar_url: string | null;
  access_token_enc: string;
  access_expires_at: string;
  refresh_token_enc: string;
  refresh_expires_at: string;
  status: "active" | "reconnect";
  connected_at: string;
};
export type PublicShopee = Pick<ShopeeConnection, "id" | "shopee_user_id" | "shop_id" | "role" | "name" | "avatar_url" | "status" | "connected_at">;
const PUBLIC = "id,shopee_user_id,shop_id,role,name,avatar_url,status,connected_at";
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const REFRESH_DAYS = 30;

const tokenFields = (t: { accessToken: string; refreshToken: string; expiresIn: number }) => ({
  access_token_enc: encryptToken(t.accessToken),
  access_expires_at: iso(Date.now() + t.expiresIn * 1000),
  refresh_token_enc: encryptToken(t.refreshToken),
  refresh_expires_at: iso(Date.now() + REFRESH_DAYS * 86400e3),
});

/** Saves a connection; connecting the same Shopee account again refreshes it (no duplicate). */
export async function saveShopee(userId: string, a: { role: ShopeeRole; userId: string; shopId: string | null; name: string | null; avatarUrl: string | null; accessToken: string; refreshToken: string; expiresIn: number }): Promise<void> {
  await supabaseRest("shopee_connections?on_conflict=user_id,shopee_user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, shopee_user_id: a.userId, shop_id: a.shopId, role: a.role, name: a.name, avatar_url: a.avatarUrl, ...tokenFields(a), status: "active", updated_at: iso() }),
  });
}

export async function listShopee(userId: string): Promise<PublicShopee[]> {
  return (await supabaseRest(`shopee_connections?user_id=eq.${userId}&select=${PUBLIC}&order=connected_at`)).json();
}

export async function getShopee(id: string, userId?: string): Promise<ShopeeConnection | null> {
  const mine = userId ? `&user_id=eq.${userId}` : "";
  const [row] = (await (await supabaseRest(`shopee_connections?id=eq.${id}${mine}&limit=1`)).json()) as ShopeeConnection[];
  return row ?? null;
}

export async function removeShopee(userId: string, id: string): Promise<boolean> {
  const res = await supabaseRest(`shopee_connections?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=representation" } });
  return ((await res.json()) as unknown[]).length > 0;
}

/** Shopee stopped accepting the sign-in: the channel shows "Reconnect" (and Today's warning) until it's connected again. */
export async function markShopeeReconnect(id: string): Promise<void> {
  await supabaseRest(`shopee_connections?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "reconnect", updated_at: iso() }) });
}

export const RECONNECT_SHOPEE = "This Shopee account needs reconnecting in Rezekii (Posts → Channels).";

/**
 * Swaps the refresh token for a new pair and saves both (the old refresh token stops working). Shopee saying the sign-in has
 * ended marks the channel "Reconnect".
 */
export async function renewShopee(c: ShopeeConnection): Promise<string> {
  try {
    const t = await refreshShopeeToken(decryptToken(c.refresh_token_enc), { userId: c.shopee_user_id, shopId: c.role === "seller" ? c.shop_id : null });
    await supabaseRest(`shopee_connections?id=eq.${c.id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ...tokenFields(t), status: "active", updated_at: iso() }) });
    return t.accessToken;
  } catch (err) {
    if (err instanceof ShopeeError && err.needsReconnect) {
      await markShopeeReconnect(c.id);
      throw new Error(RECONNECT_SHOPEE);
    }
    throw err;
  }
}

/** The access token, renewed first when it has under 10 minutes left. */
export async function freshShopeeToken(c: ShopeeConnection): Promise<string> {
  if (c.status === "reconnect") throw new Error(RECONNECT_SHOPEE);
  if (Date.parse(c.access_expires_at) > Date.now() + 10 * 60e3) return decryptToken(c.access_token_enc);
  return renewShopee(c);
}

/** Check now (Channels): renewing the sign-in is the check; a channel that works again is active again. */
export async function checkShopee(c: ShopeeConnection): Promise<"active" | "reconnect"> {
  try {
    await renewShopee(c);
    return "active";
  } catch (err) {
    if (err instanceof Error && err.message === RECONNECT_SHOPEE) return "reconnect";
    throw err;
  }
}

/** Active connections whose 30-day refresh token runs out within a week, renewed by the daily timer even when nothing is posted. */
export async function shopeeToRenew(limit: number): Promise<ShopeeConnection[]> {
  const soon = iso(Date.now() + 7 * 86400e3);
  return (await supabaseRest(`shopee_connections?status=eq.active&refresh_expires_at=lt.${encodeURIComponent(soon)}&order=refresh_expires_at&limit=${limit}`)).json();
}
