import { AUTH_BASE, CREATOR_AUTH_URL, appCredentials } from "./config.ts";
import type { ApiReply } from "./api.ts";

export type TokenSet = {
  access_token: string;
  /** Unix seconds when the access token expires. */
  access_token_expire_in: number;
  refresh_token: string;
  /** Unix seconds when the refresh token expires. */
  refresh_token_expire_in: number;
  open_id?: string;
  user_type?: number;
  granted_scopes?: string[];
};

/** Where a creator approves Rezekii in TikTok Shop. `state` guards the return trip. */
export function creatorAuthUrl(state: string): string {
  const { appKey } = appCredentials();
  return `${CREATOR_AUTH_URL}?${new URLSearchParams({ app_key: appKey, state })}`;
}

async function tokenRequest(path: string, grant: Record<string, string>): Promise<ApiReply<TokenSet>> {
  const { appKey, appSecret } = appCredentials();
  const query = new URLSearchParams({ app_key: appKey, app_secret: appSecret, ...grant });
  const res = await fetch(`${AUTH_BASE}${path}?${query}`, { cache: "no-store" });
  return (await res.json()) as ApiReply<TokenSet>;
}

/** Swaps the one-time code (valid 30 minutes) for tokens. */
export function exchangeAuthCode(code: string) {
  return tokenRequest("/api/v2/token/get", { auth_code: code, grant_type: "authorized_code" });
}

export function refreshTokens(refreshToken: string) {
  return tokenRequest("/api/v2/token/refresh", { refresh_token: refreshToken, grant_type: "refresh_token" });
}
