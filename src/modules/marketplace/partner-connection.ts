import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TokenSet } from "../../integrations/tiktok-shop/auth.ts";
import type { CategoryAsset } from "../../integrations/tiktok-shop/partner.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";

/** During the v0.1 proof only partners whose name contains one of these (env PROOF_PARTNER_NAMES, comma-separated) may connect. */
export function isAllowedPartnerDuringProof(name: string): boolean {
  const wanted = (process.env.PROOF_PARTNER_NAMES ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  const have = name.trim().toLowerCase();
  return !!have && wanted.some((w) => have.includes(w));
}

const isoFromUnix = (seconds: number) => new Date(seconds * 1000).toISOString();

/** Saves or replaces Techwide's Partner Connection (TikTok Shop Partner Center login, used for TAP campaigns). */
export async function savePartnerConnection(partner: { openId: string; name: string; assets?: CategoryAsset[] }, tokens: TokenSet): Promise<void> {
  await supabaseRest("partner_connections?on_conflict=partner_open_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      partner_open_id: partner.openId,
      name: partner.name,
      ...(partner.assets ? { category_assets: partner.assets } : {}),
      access_token_enc: encryptToken(tokens.access_token),
      access_token_expires_at: isoFromUnix(tokens.access_token_expire_in),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      refresh_token_expires_at: isoFromUnix(tokens.refresh_token_expire_in),
      granted_scopes: tokens.granted_scopes ?? null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export type StoredPartner = { openId: string; name: string; assets: CategoryAsset[]; accessToken: string; accessExpiresAt: Date; refreshToken: string };

/** The most recently connected partner (Techwide). */
export async function getPartnerConnection(): Promise<StoredPartner | null> {
  const res = await supabaseRest("partner_connections?select=*&order=updated_at.desc&limit=1");
  type Row = { partner_open_id: string; name: string; category_assets: CategoryAsset[] | null; access_token_enc: string; access_token_expires_at: string; refresh_token_enc: string };
  const [row] = (await res.json()) as Row[];
  if (!row) return null;
  return {
    openId: row.partner_open_id,
    name: row.name,
    assets: row.category_assets ?? [],
    accessToken: decryptToken(row.access_token_enc),
    accessExpiresAt: new Date(row.access_token_expires_at),
    refreshToken: decryptToken(row.refresh_token_enc),
  };
}
