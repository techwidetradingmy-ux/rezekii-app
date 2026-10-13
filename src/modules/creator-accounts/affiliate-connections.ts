import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { refreshTokens, type TokenSet } from "../../integrations/tiktok-shop/auth.ts";
import { decryptToken, encryptToken } from "./token-crypto.ts";

/** During the v0.1 proof only these handles may connect (env PROOF_ALLOWED_HANDLES, comma-separated). */
export function isAllowedDuringProof(username: string): boolean {
  const normalise = (h: string) => h.trim().replace(/^@/, "").toLowerCase();
  const allowed = (process.env.PROOF_ALLOWED_HANDLES ?? "").split(",").map(normalise).filter(Boolean);
  return allowed.includes(normalise(username));
}

const isoFromUnix = (seconds: number) => new Date(seconds * 1000).toISOString();

/** Saves or replaces a Creator Account's Affiliate Connection. Columns left out (e.g. no avatar on a token refresh) keep their stored value. */
export async function saveAffiliateConnection(
  profile: { openId: string; username: string; avatarUrl?: string; userId?: string },
  tokens: TokenSet,
): Promise<void> {
  await supabaseRest("affiliate_connections?on_conflict=creator_user_open_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      creator_user_open_id: profile.openId,
      username: profile.username.toLowerCase(),
      ...(profile.avatarUrl !== undefined ? { avatar_url: profile.avatarUrl } : {}),
      ...(profile.userId !== undefined ? { user_id: profile.userId } : {}),
      access_token_enc: encryptToken(tokens.access_token),
      access_token_expires_at: isoFromUnix(tokens.access_token_expire_in),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      refresh_token_expires_at: isoFromUnix(tokens.refresh_token_expire_in),
      granted_scopes: tokens.granted_scopes ?? null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export type StoredConnection = {
  openId: string;
  username: string;
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
};

const toStored = (row: Record<string, string> | undefined): StoredConnection | null =>
  row
    ? {
        openId: row.creator_user_open_id,
        username: row.username,
        accessToken: decryptToken(row.access_token_enc),
        accessExpiresAt: new Date(row.access_token_expires_at),
        refreshToken: decryptToken(row.refresh_token_enc),
      }
    : null;

/** The TikTok Shop creator account a Rezekii account linked, or null. */
export async function connectionForUser(userId: string): Promise<StoredConnection | null> {
  const [row] = (await (await supabaseRest(`affiliate_connections?user_id=eq.${userId}&select=*&order=updated_at.desc&limit=1`)).json()) as Record<string, string>[];
  return toStored(row);
}

export async function getAffiliateConnection(username: string): Promise<StoredConnection | null> {
  const res = await supabaseRest(
    `affiliate_connections?username=eq.${encodeURIComponent(username.replace(/^@/, "").toLowerCase())}&select=*&limit=1`,
  );
  const [row] = (await res.json()) as Record<string, string>[];
  if (!row) return null;
  return {
    openId: row.creator_user_open_id,
    username: row.username,
    accessToken: decryptToken(row.access_token_enc),
    accessExpiresAt: new Date(row.access_token_expires_at),
    refreshToken: decryptToken(row.refresh_token_enc),
  };
}

/** A linked creator's TikTok Shop access token, renewed (and saved) when it expires within 10 minutes. */
export async function freshCreatorToken(conn: StoredConnection | null): Promise<string | null> {
  if (!conn) return null;
  if (conn.accessExpiresAt.getTime() > Date.now() + 10 * 60_000) return conn.accessToken;
  const r = await refreshTokens(conn.refreshToken);
  if (r.code !== 0 || !r.data) throw new Error(`TikTok Shop token renewal failed: ${r.code} ${r.message}`);
  await saveAffiliateConnection({ openId: conn.openId, username: conn.username }, r.data);
  return r.data.access_token;
}
