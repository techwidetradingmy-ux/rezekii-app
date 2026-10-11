import { createHash, randomBytes } from "node:crypto";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { AppUser } from "./users.ts";

/** Sessions: a random token in an HTTP-only cookie; the database keeps only its SHA-256 hash. */
export const SESSION_COOKIE = "rz_session";
const SESSION_DAYS = 30;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionCookieOptions(expires: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires };
}

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await supabaseRest("app_sessions", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ token_hash: hashToken(token), user_id: userId, expires_at: expires.toISOString() }),
  });
  return { token, expires };
}

/** The signed-in account for this session token, or null if the token is unknown or expired. */
export async function userForSession(token: string | undefined): Promise<AppUser | null> {
  if (!token) return null;
  const res = await supabaseRest(
    `app_sessions?token_hash=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=app_users(*)&limit=1`,
  );
  const [row] = (await res.json()) as { app_users: AppUser | null }[];
  return row?.app_users ?? null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (token) await supabaseRest(`app_sessions?token_hash=eq.${hashToken(token)}`, { method: "DELETE" });
}
