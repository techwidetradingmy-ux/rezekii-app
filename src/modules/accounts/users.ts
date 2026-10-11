import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TikTokTokens } from "../../integrations/tiktok/login.ts";
import { encryptToken } from "../creator-accounts/token-crypto.ts";

export type AppUser = {
  id: string;
  role: "admin" | "creator";
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  tiktok_open_id: string | null;
  tiktok_username: string | null;
};

const DEFAULT_ADMINS = "techwidemarketingai@gmail.com";

/** Admins are Google accounts on the allow-list (env ADMIN_EMAILS, comma-separated), and only with a verified email. */
export function roleForGoogle(email: string | undefined, verified: boolean | undefined): AppUser["role"] {
  const admins = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return verified && email && admins.includes(email.trim().toLowerCase()) ? "admin" : "creator";
}

const now = () => new Date().toISOString();
const first = async (res: Response) => ((await res.json()) as AppUser[])[0] ?? null;

async function findBy(column: "google_sub" | "tiktok_open_id", value: string): Promise<AppUser | null> {
  return first(await supabaseRest(`app_users?${column}=eq.${encodeURIComponent(value)}&select=*&limit=1`));
}

async function patch(id: string, fields: Record<string, unknown>): Promise<AppUser> {
  const res = await supabaseRest(`app_users?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(fields) });
  return (await first(res)) as AppUser;
}

async function insert(fields: Record<string, unknown>): Promise<AppUser> {
  const res = await supabaseRest("app_users", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(fields) });
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
