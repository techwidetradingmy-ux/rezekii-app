import { createHash, randomBytes } from "node:crypto";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { USER_COLUMNS, type AppUser } from "./users.ts";

/** Sessions: a random token in an HTTP-only cookie; the database keeps only its SHA-256 hash. */
export const SESSION_COOKIE = "rz_session";
/** Signed in for 90 days, renewed while she uses Rezekii (owner, 2 Nov 2026: the home-screen app kept asking to sign in). */
const SESSION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionCookieOptions(expires: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires };
}

/**
 * A marker the page can read before it draws (owner, 31 Oct 2026: right after signing in, the sample name and photo showed
 * until her account loaded). It holds nothing secret: it only says "signed in", so the app waits for her real data.
 */
export const SIGNED_IN_COOKIE = "rz_in";
export const signedInCookieOptions = (expires: Date) => ({ httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires });

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS);
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
    `app_sessions?token_hash=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=app_users(${USER_COLUMNS})&limit=1`,
  );
  const [row] = (await res.json()) as { app_users: AppUser | null }[];
  return row?.app_users ?? null;
}

/** Moves a session's end to 90 days from now, at most once a day. The new end when it was moved (to set the cookies again), else null. */
export async function renewSession(token: string | undefined): Promise<Date | null> {
  if (!token) return null;
  const now = Date.now();
  const expires = new Date(now + SESSION_DAYS * DAY_MS);
  const due = `and=(expires_at.gt.${new Date(now).toISOString()},expires_at.lt.${new Date(now + (SESSION_DAYS - 1) * DAY_MS).toISOString()})`;
  const res = await supabaseRest(`app_sessions?token_hash=eq.${hashToken(token)}&${due}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ expires_at: expires.toISOString() }) });
  return ((await res.json()) as unknown[]).length ? expires : null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (token) await supabaseRest(`app_sessions?token_hash=eq.${hashToken(token)}`, { method: "DELETE" });
}
