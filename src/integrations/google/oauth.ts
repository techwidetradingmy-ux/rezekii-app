/** Google sign-in (OAuth 2.0 authorization code flow). Server-only: uses the client secret. */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function credentials(): { id: string; secret: string } {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  return { id, secret };
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({
    client_id: credentials().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${q}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{ access_token?: string; error?: string; error_description?: string }> {
  const { id, secret } = credentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    cache: "no-store",
  });
  return res.json();
}

export type GoogleUser = { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

export async function getGoogleUser(accessToken: string): Promise<GoogleUser | null> {
  const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  return res.ok ? res.json() : null;
}
