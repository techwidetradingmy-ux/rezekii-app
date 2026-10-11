import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TokenSet } from "../../integrations/tiktok-shop/auth.ts";
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

/** Saves or replaces a seller shop's connection (for TikTok's seller-only creator data). */
export async function saveSellerConnection(shop: AuthorizedShop, tokens: TokenSet): Promise<void> {
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
