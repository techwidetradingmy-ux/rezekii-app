import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { refreshTokens, type TokenSet } from "../../integrations/tiktok-shop/auth.ts";
import type { AuthorizedShop } from "../../integrations/tiktok-shop/seller.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";

/**
 * During the proof only these shops (env PROOF_SELLER_SHOPS, comma-separated shop names, any case) may connect.
 * Shop names are real names here, unlike partner logins, which TikTok all calls "Partner account".
 */
export function isAllowedSellerDuringProof(shopName: string | undefined): boolean {
  const wanted = (process.env.PROOF_SELLER_SHOPS ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  return !!shopName && wanted.includes(shopName.trim().toLowerCase());
}

const isoFromUnix = (seconds: number) => new Date(seconds * 1000).toISOString();

/**
 * Saves or replaces a seller shop's connection (for TikTok's seller-only creator data). `connectedBy` is the Rezekii account that
 * authorized it in Seller Center (owner, 30 Oct 2026); left out, the shop keeps whoever it had.
 */
export async function saveSellerConnection(shop: AuthorizedShop, tokens: TokenSet, connectedBy?: string): Promise<void> {
  await supabaseRest("seller_connections?on_conflict=shop_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      shop_id: shop.id,
      shop_name: shop.name,
      shop_code: shop.code ?? null,
      shop_cipher: shop.cipher,
      region: shop.region ?? null,
      seller_open_id: tokens.open_id ?? null,
      access_token_enc: encryptToken(tokens.access_token),
      access_token_expires_at: isoFromUnix(tokens.access_token_expire_in),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      refresh_token_expires_at: isoFromUnix(tokens.refresh_token_expire_in),
      granted_scopes: tokens.granted_scopes ?? null,
      ...(connectedBy ? { connected_by: connectedBy } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
}

export type StoredSeller = { shop: AuthorizedShop; accessToken: string; accessExpiresAt: Date; refreshToken: string };

/** The most recently connected seller shop. */
export async function getSellerConnection(): Promise<StoredSeller | null> {
  const res = await supabaseRest("seller_connections?select=*&order=updated_at.desc&limit=1");
  type Row = { shop_id: string; shop_name: string; shop_code: string | null; shop_cipher: string; region: string | null; access_token_enc: string; access_token_expires_at: string; refresh_token_enc: string };
  const [row] = (await res.json()) as Row[];
  if (!row) return null;
  return {
    shop: { id: row.shop_id, name: row.shop_name, cipher: row.shop_cipher, code: row.shop_code ?? undefined, region: row.region ?? undefined },
    accessToken: decryptToken(row.access_token_enc),
    accessExpiresAt: new Date(row.access_token_expires_at),
    refreshToken: decryptToken(row.refresh_token_enc),
  };
}

/**
 * The shop a signed-in person may see in the seller app (owner, 30 Oct 2026): the one they authorized in Seller Center, or for
 * an admin the latest connected. Its access is renewed when it expires within 10 minutes. Null when they have none.
 */
export async function sellerAccessFor(user: { id: string; role: string }): Promise<{ shop: AuthorizedShop; token: string } | null> {
  const mine = user.role === "admin" ? "" : `connected_by=eq.${user.id}&`;
  const res = await supabaseRest(`seller_connections?${mine}select=*&order=updated_at.desc&limit=1`);
  type Row = { shop_id: string; shop_name: string; shop_code: string | null; shop_cipher: string; region: string | null; access_token_enc: string; access_token_expires_at: string; refresh_token_enc: string };
  const [row] = (await res.json()) as Row[];
  if (!row) return null;
  const shop: AuthorizedShop = { id: row.shop_id, name: row.shop_name, cipher: row.shop_cipher, code: row.shop_code ?? undefined, region: row.region ?? undefined };
  if (Date.parse(row.access_token_expires_at) > Date.now() + 10 * 60_000) return { shop, token: decryptToken(row.access_token_enc) };
  const r = await refreshTokens(decryptToken(row.refresh_token_enc));
  if (r.code !== 0 || !r.data) throw new Error(`Seller token renewal failed: ${r.code} ${r.message}`);
  await saveSellerConnection(shop, r.data);
  return { shop, token: r.data.access_token };
}

/** The name of the shop this person sees in the seller app (as sellerAccessFor picks it), or null. No TikTok call. */
export async function sellerShopName(user: { id: string; role: string }): Promise<string | null> {
  const mine = user.role === "admin" ? "" : `connected_by=eq.${user.id}&`;
  const [row] = (await (await supabaseRest(`seller_connections?${mine}select=shop_name&order=updated_at.desc&limit=1`)).json()) as { shop_name: string }[];
  return row?.shop_name ?? null;
}
