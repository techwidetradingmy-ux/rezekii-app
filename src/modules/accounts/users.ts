import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TikTokTokens } from "../../integrations/tiktok/login.ts";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import { tiktokKey } from "../social/picker.ts";
import { emailLoginProblem, hashPassword, verifyPassword } from "./password.ts";

export type AppUser = {
  id: string;
  role: "admin" | "creator";
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  tiktok_open_id: string | null;
  tiktok_username: string | null;
};

/** The columns an AppUser is made of. Password fields are never read into it. */
export const USER_COLUMNS = "id,role,display_name,avatar_url,email,tiktok_open_id,tiktok_username";

export const DEFAULT_ADMINS = "techwidemarketingai@gmail.com";

/**
 * Admins are Google accounts on the allow-list (env ADMIN_EMAILS, comma-separated, plus `added` from Settings),
 * and only with a verified email.
 */
export function roleForGoogle(email: string | undefined, verified: boolean | undefined, added: string[] = []): AppUser["role"] {
  const admins = [...(process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS).split(","), ...added].map((e) => e.trim().toLowerCase()).filter(Boolean);
  return verified && email && admins.includes(email.trim().toLowerCase()) ? "admin" : "creator";
}

const now = () => new Date().toISOString();
const first = async (res: Response) => ((await res.json()) as AppUser[])[0] ?? null;

async function findBy(column: "google_sub" | "tiktok_open_id", value: string): Promise<AppUser | null> {
  return first(await supabaseRest(`app_users?${column}=eq.${encodeURIComponent(value)}&select=${USER_COLUMNS}&limit=1`));
}

async function patch(id: string, fields: Record<string, unknown>): Promise<AppUser> {
  const res = await supabaseRest(`app_users?id=eq.${id}&select=${USER_COLUMNS}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(fields) });
  return (await first(res)) as AppUser;
}

async function insert(fields: Record<string, unknown>): Promise<AppUser> {
  const res = await supabaseRest(`app_users?select=${USER_COLUMNS}`, { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(fields) });
  return (await first(res)) as AppUser;
}

/** The admin emails added in Settings (on top of ADMIN_EMAILS). */
const addedAdmins = async () => ((await (await supabaseRest("admin_emails?select=email")).json()) as { email: string }[]).map((r) => r.email);

/** Signs in with Google: finds the account by Google ID or creates it. The role is re-checked against the admin list every time. */
export async function upsertGoogleUser(g: { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string }): Promise<AppUser> {
  const fields = { email: g.email ?? null, display_name: g.name ?? null, avatar_url: g.picture ?? null, role: roleForGoogle(g.email, g.email_verified, await addedAdmins()), last_sign_in_at: now() };
  const existing = await findBy("google_sub", g.sub);
  return existing ? patch(existing.id, fields) : insert({ ...fields, google_sub: g.sub });
}

/** Signs in with TikTok: finds the account by TikTok open ID or creates a creator account. An existing role is kept. */
export async function upsertTikTokUser(t: { open_id: string; username?: string; display_name?: string; avatar_url?: string }): Promise<AppUser> {
  const fields = { tiktok_username: t.username?.toLowerCase() ?? null, display_name: t.display_name ?? null, avatar_url: t.avatar_url ?? null, last_sign_in_at: now() };
  const existing = await findBy("tiktok_open_id", t.open_id);
  return existing ? patch(existing.id, fields) : insert({ ...fields, tiktok_open_id: t.open_id, role: "creator" });
}

export type TikTokProfile = { open_id: string; union_id?: string; username?: string; display_name?: string; avatar_url?: string };

/**
 * When rezekii.com moved from TikTok's Sandbox key to the Production key, TikTok gave every account a new open_id. A
 * connection saved before then (and not seen since) under the same TikTok username is the same account. Usernames can pass
 * to someone else in time, so this match stops at the end of 2026; union_id (saved from now on) needs no end.
 */
export const PRODUCTION_KEY_FROM = "2026-10-26T10:20:00Z";
const BY_USERNAME_UNTIL = Date.parse("2027-01-01T00:00:00+08:00");

/** The same TikTok account connected before under another open_id: by union_id, or by username for a pre-switch connection. */
export async function earlierConnection(t: TikTokProfile, now = Date.now()): Promise<{ open_id: string; user_id: string } | null> {
  const not = `open_id=neq.${encodeURIComponent(t.open_id)}`;
  const byUnion = t.union_id ? `tiktok_connections?union_id=eq.${encodeURIComponent(t.union_id)}&${not}&select=open_id,user_id&limit=1` : null;
  const byName = t.username && now < BY_USERNAME_UNTIL ? `tiktok_connections?username=eq.${encodeURIComponent(t.username.toLowerCase())}&union_id=is.null&updated_at=lt.${PRODUCTION_KEY_FROM}&${not}&select=open_id,user_id&limit=1` : null;
  for (const path of [byUnion, byName]) {
    if (!path) continue;
    const [c] = (await (await supabaseRest(path)).json()) as { open_id: string; user_id: string }[];
    if (c) return c;
  }
  return null;
}

/**
 * TikTok from Account: when someone is already signed in and no other Rezekii account uses this TikTok account, it is
 * connected to the signed-in account (their own name and photo are kept). Otherwise it signs in as usual. An account TikTok
 * gave a new open_id (see earlierConnection) stays with the Rezekii account it belonged to.
 */
export async function linkOrSignInTikTok(current: AppUser | null, t: TikTokProfile): Promise<{ user: AppUser; linked: boolean } | { taken: true }> {
  let owner = await findBy("tiktok_open_id", t.open_id);
  if (!owner) {
    // Held as another account's connection (e.g. a Techwide team account): never sign in with it, and never move it.
    const [conn] = (await (await supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(t.open_id)}&select=user_id&limit=1`)).json()) as { user_id: string }[];
    if (conn && conn.user_id !== current?.id) return { taken: true };
    const before = conn ? null : await earlierConnection(t);
    if (before && before.user_id !== current?.id) {
      // Signing in with it: only when it was that Rezekii account's own TikTok sign-in, not a team account it holds.
      const [u] = current ? [] : ((await (await supabaseRest(`app_users?id=eq.${before.user_id}&select=${USER_COLUMNS}&limit=1`)).json()) as AppUser[]);
      if (!u || u.tiktok_open_id !== before.open_id) return { taken: true };
      owner = await patch(u.id, { tiktok_open_id: t.open_id });
    }
  }
  // Signed in already and this TikTok has its own Rezekii account: keep the two apart (no silent switch of accounts).
  if (current && owner && owner.id !== current.id) return { taken: true };
  if (current && (!owner || owner.id === current.id)) {
    const user = await patch(current.id, {
      tiktok_open_id: t.open_id,
      tiktok_username: t.username?.toLowerCase() ?? current.tiktok_username,
      ...(current.avatar_url ? {} : { avatar_url: t.avatar_url ?? null }),
      ...(current.display_name ? {} : { display_name: t.display_name ?? null }),
      last_sign_in_at: now(),
    });
    return { user, linked: true };
  }
  return { user: await upsertTikTokUser(t), linked: false };
}

const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString();

/**
 * Saves the account's TikTok connection (tokens encrypted), used later for posting; connecting again makes it active. The
 * same account's connection under an earlier open_id is replaced: its posts, videos and brands move to the new one.
 */
export async function saveTikTokConnection(userId: string, profile: TikTokProfile, tokens: TikTokTokens): Promise<void> {
  const before = await earlierConnection(profile);
  await supabaseRest("tiktok_connections?on_conflict=open_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      open_id: profile.open_id,
      union_id: profile.union_id ?? null,
      status: "active",
      user_id: userId,
      username: profile.username?.toLowerCase() ?? null,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      access_token_enc: encryptToken(tokens.access_token),
      access_token_expires_at: inSeconds(tokens.expires_in),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      refresh_token_expires_at: inSeconds(tokens.refresh_expires_in),
      scopes: tokens.scope ? tokens.scope.split(",") : null,
      updated_at: now(),
    }),
  });
  if (before?.user_id === userId) await replaceTikTokConnection(userId, before.open_id, profile.open_id);
}

/** The account's old open_id gives way to its new one: posts, saved videos and brand channels move over, the old connection goes. */
export async function replaceTikTokConnection(userId: string, oldId: string, newId: string): Promise<void> {
  const from = encodeURIComponent(oldId);
  const move = (path: string, body: unknown) => supabaseRest(path, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify(body) });
  await move(`posts?user_id=eq.${userId}&tiktok_open_id=eq.${from}`, { tiktok_open_id: newId });
  await move(`tiktok_videos?open_id=eq.${from}`, { open_id: newId });
  const brands = (await (await supabaseRest(`social_brands?user_id=eq.${userId}&channels=cs.${encodeURIComponent(`{"${tiktokKey(oldId)}"}`)}&select=id,channels`)).json()) as { id: string; channels: string[] }[];
  for (const b of brands) await move(`social_brands?id=eq.${b.id}`, { channels: b.channels.map((c) => (c === tiktokKey(oldId) ? tiktokKey(newId) : c)) });
  await move(`app_users?id=eq.${userId}&tiktok_open_id=eq.${from}`, { tiktok_open_id: newId });
  await supabaseRest(`tiktok_connections?open_id=eq.${from}&user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
}

export type EmailResult = { ok: true; user: AppUser } | { ok: false; error: string; status: number };
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
let dummyHash: Promise<string> | null = null;

/** Creates a creator account that signs in with email and password. The email must not already have a password account. */
export async function createEmailUser(email: string, password: string, name: string | null): Promise<EmailResult> {
  const taken = (await (await supabaseRest(`app_users?email=eq.${encodeURIComponent(email)}&password_hash=not.is.null&select=id&limit=1`)).json()) as unknown[];
  const exists: EmailResult = { ok: false, error: "An account with this email already exists. Sign in instead.", status: 409 };
  if (taken.length) return exists;
  try {
    const user = await insert({ email, display_name: name, role: "creator", password_hash: await hashPassword(password), last_sign_in_at: now() });
    return { ok: true, user };
  } catch (err) {
    // Two sign-ups with the same email at once: the unique index refuses the second.
    if (err instanceof Error && err.message.startsWith("Supabase 409")) return exists;
    throw err;
  }
}

/** Adds email sign-in to a signed-in account, or changes its email or password; the rules are in emailLoginProblem. */
export async function setEmailLogin(userId: string, change: { email?: string | null; password?: string }, current: string): Promise<EmailResult> {
  type Row = { role: string; email: string | null; google_sub: string | null; password_hash: string | null };
  const [me] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=role,email,google_sub,password_hash&limit=1`)).json()) as Row[];
  if (!me) return { ok: false, error: "Sign in first.", status: 401 };
  const currentOk = !!me.password_hash && (await verifyPassword(current, me.password_hash));
  const problem = emailLoginProblem({ role: me.role, hasPassword: !!me.password_hash, currentOk, ...change, googleEmail: me.google_sub ? me.email : null });
  if (problem) return { ok: false, error: problem, status: me.password_hash && !currentOk ? 403 : 400 };
  const taken: EmailResult = { ok: false, error: "Another Rezekii account already signs in with this email.", status: 409 };
  if (change.email) {
    const others = (await (await supabaseRest(`app_users?email=eq.${encodeURIComponent(change.email)}&password_hash=not.is.null&id=neq.${userId}&select=id&limit=1`)).json()) as unknown[];
    if (others.length) return taken;
  }
  const fields: Record<string, unknown> = { failed_logins: 0, locked_until: null };
  if (change.email) fields.email = change.email;
  if (change.password !== undefined) fields.password_hash = await hashPassword(change.password);
  try {
    return { ok: true, user: await patch(userId, fields) };
  } catch (err) {
    // The unique index on email logins refuses an email another account took at the same moment.
    if (err instanceof Error && err.message.startsWith("Supabase 409")) return taken;
    throw err;
  }
}

/**
 * Email sign-in. After 5 wrong passwords the account is locked for 15 minutes. Unknown emails take as long as wrong passwords.
 * A Google admin signing in with their password stays admin only while their email is on the admin list, as with Google.
 */
export async function emailSignIn(email: string, password: string): Promise<EmailResult> {
  const wrong: EmailResult = { ok: false, error: "Wrong email or password.", status: 401 };
  type Row = { id: string; password_hash: string; failed_logins: number; locked_until: string | null; role: AppUser["role"]; email: string | null; google_sub: string | null };
  const [row] = (await (await supabaseRest(`app_users?email=eq.${encodeURIComponent(email)}&password_hash=not.is.null&select=id,password_hash,failed_logins,locked_until,role,email,google_sub&limit=1`)).json()) as Row[];
  if (!row) {
    dummyHash ??= hashPassword("not a real password");
    await verifyPassword(password, await dummyHash);
    return wrong;
  }
  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) return { ok: false, error: `Too many tries. Please wait ${LOCK_MINUTES} minutes and try again.`, status: 429 };
  if (!(await verifyPassword(password, row.password_hash))) {
    const n = row.failed_logins + 1;
    const lock = n >= LOCK_AFTER;
    await supabaseRest(`app_users?id=eq.${row.id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ failed_logins: lock ? 0 : n, locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null }) });
    return lock ? { ok: false, error: `Too many tries. Please wait ${LOCK_MINUTES} minutes and try again.`, status: 429 } : wrong;
  }
  const demoted = row.role === "admin" && !!row.google_sub && roleForGoogle(row.email ?? undefined, true, await addedAdmins()) !== "admin";
  return { ok: true, user: await patch(row.id, { failed_logins: 0, locked_until: null, last_sign_in_at: now(), ...(demoted ? { role: "creator" } : {}) }) };
}
