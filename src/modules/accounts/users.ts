import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TikTokTokens } from "../../integrations/tiktok/login.ts";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import { hashPassword, verifyPassword } from "./password.ts";

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

const DEFAULT_ADMINS = "techwidemarketingai@gmail.com";

/** Admins are Google accounts on the allow-list (env ADMIN_EMAILS, comma-separated), and only with a verified email. */
export function roleForGoogle(email: string | undefined, verified: boolean | undefined): AppUser["role"] {
  const admins = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
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

/** Signs in with Google: finds the account by Google ID or creates it. The role is re-checked against the admin list every time. */
export async function upsertGoogleUser(g: { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string }): Promise<AppUser> {
  const fields = { email: g.email ?? null, display_name: g.name ?? null, avatar_url: g.picture ?? null, role: roleForGoogle(g.email, g.email_verified), last_sign_in_at: now() };
  const existing = await findBy("google_sub", g.sub);
  return existing ? patch(existing.id, fields) : insert({ ...fields, google_sub: g.sub });
}

/** Signs in with TikTok: finds the account by TikTok open ID or creates a creator account. An existing role is kept. */
export async function upsertTikTokUser(t: { open_id: string; username?: string; display_name?: string; avatar_url?: string }): Promise<AppUser> {
  const fields = { tiktok_username: t.username?.toLowerCase() ?? null, display_name: t.display_name ?? null, avatar_url: t.avatar_url ?? null, last_sign_in_at: now() };
  const existing = await findBy("tiktok_open_id", t.open_id);
  return existing ? patch(existing.id, fields) : insert({ ...fields, tiktok_open_id: t.open_id, role: "creator" });
}

/**
 * TikTok from My accounts: when someone is already signed in and no other Rezekii account uses this TikTok account, it is
 * connected to the signed-in account (their own name and photo are kept). Otherwise it signs in as usual.
 */
export async function linkOrSignInTikTok(current: AppUser | null, t: { open_id: string; username?: string; display_name?: string; avatar_url?: string }): Promise<{ user: AppUser; linked: boolean }> {
  const owner = await findBy("tiktok_open_id", t.open_id);
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

/** Saves the account's TikTok connection (tokens encrypted), used later for posting. */
export async function saveTikTokConnection(userId: string, profile: { open_id: string; username?: string; display_name?: string; avatar_url?: string }, tokens: TikTokTokens): Promise<void> {
  await supabaseRest("tiktok_connections?on_conflict=open_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      open_id: profile.open_id,
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

/** Email sign-in. After 5 wrong passwords the account is locked for 15 minutes. Unknown emails take as long as wrong passwords. */
export async function emailSignIn(email: string, password: string): Promise<EmailResult> {
  const wrong: EmailResult = { ok: false, error: "Wrong email or password.", status: 401 };
  type Row = { id: string; password_hash: string; failed_logins: number; locked_until: string | null };
  const [row] = (await (await supabaseRest(`app_users?email=eq.${encodeURIComponent(email)}&password_hash=not.is.null&select=id,password_hash,failed_logins,locked_until&limit=1`)).json()) as Row[];
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
  return { ok: true, user: await patch(row.id, { failed_logins: 0, locked_until: null, last_sign_in_at: now() }) };
}
