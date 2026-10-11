/**
 * TikTok for Developers: Login Kit (web) and its user tokens, also used later for Content Posting.
 * Separate from TikTok Shop's creator authorization. Server-only: uses the client secret.
 */
const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

/** Scopes asked for at sign-in. Every scope must be enabled on the app (and shown in the review demo). Override with TIKTOK_SCOPES. */
export const DEFAULT_SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list", "video.publish", "video.upload"];
export const tiktokScopes = () => (process.env.TIKTOK_SCOPES ? process.env.TIKTOK_SCOPES.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_SCOPES);

function credentials(): { key: string; secret: string } {
  const key = process.env.TIKTOK_CLIENT_KEY;
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  if (!key || !secret) throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set");
  return { key, secret };
}

export function tiktokAuthUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_key: credentials().key, scope: tiktokScopes().join(","), response_type: "code", redirect_uri: redirectUri, state });
  return `${AUTH_URL}?${q}`;
}

export type TikTokTokens = {
  access_token: string;
  /** Seconds from now. */
  expires_in: number;
  refresh_token: string;
  /** Seconds from now. */
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type?: string;
};
type TokenReply = Partial<TikTokTokens> & { error?: string; error_description?: string; log_id?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenReply> {
  const { key, secret } = credentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams({ client_key: key, client_secret: secret, ...params }),
    cache: "no-store",
  });
  return res.json();
}

export const exchangeTikTokCode = (code: string, redirectUri: string) => tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
export const refreshTikTokToken = (refreshToken: string) => tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

export type TikTokUser = { open_id: string; union_id?: string; avatar_url?: string; display_name?: string; username?: string };

/** `username` needs user.info.profile; without it TikTok still returns the basic fields. */
export async function getTikTokUser(accessToken: string): Promise<{ user?: TikTokUser; error?: { code: string; message: string } }> {
  const res = await fetch(`${USERINFO_URL}?fields=open_id,union_id,avatar_url,display_name,username`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = (await res.json()) as { data?: { user?: TikTokUser }; error?: { code: string; message: string } };
  return { user: body.data?.user, error: body.error && body.error.code !== "ok" ? body.error : undefined };
}
