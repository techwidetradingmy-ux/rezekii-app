import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { DEFAULT_ADMINS } from "../accounts/users.ts";
import { shortId, shortIdMatches } from "../../lib/short-id.ts";

const json = (body: unknown, prefer = "return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });

export type ActivityKind = "Posts" | "Creators" | "Admins" | "Connections" | "TAP" | "Business";
export type Activity = { at: string; actor: string; kind: ActivityKind; what: string };

/** Adds a line to the admin activity log (Settings · Activity log). A failed log never fails the action. */
export async function logActivity(actor: string, kind: ActivityKind, what: string): Promise<void> {
  await supabaseRest("admin_activity", json({ actor, kind, what: what.slice(0, 300) })).catch((err) => console.error("[activity]", err instanceof Error ? err.message : err));
}

export async function listActivity(limit = 300): Promise<Activity[]> {
  return (await supabaseRest(`admin_activity?select=at,actor,kind,what&order=at.desc&limit=${limit}`)).json();
}

/** The short name shown in the log: the part of the email before @. */
export const actorName = (email: string | null | undefined) => (email ?? "admin").split("@")[0];

/** Admins from the ADMIN_EMAILS setting (fixed; changed only in Rezekii's server settings). */
export const fixedAdmins = () => (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** `id` is set for admins who don't sign in with Google (email and password, or TikTok); `how` says which. */
export type AdminRow = { email: string; fixed: boolean; addedBy: string | null; addedAt: string | null; id?: string; how?: "email" | "tiktok" };

/** Every admin: the fixed list first, then the ones added in Settings, then those who sign in with email and password. */
export async function listAdmins(): Promise<AdminRow[]> {
  const [added, byEmail] = await Promise.all([
    supabaseRest("admin_emails?select=email,added_by,added_at&order=added_at").then((r) => r.json() as Promise<{ email: string; added_by: string | null; added_at: string }[]>),
    supabaseRest("app_users?role=eq.admin&google_sub=is.null&select=id,email,tiktok_username,password_hash&order=created_at").then((r) => r.json() as Promise<{ id: string; email: string | null; tiktok_username: string | null; password_hash: string | null }[]>),
  ]);
  const fixed = fixedAdmins();
  return [
    ...fixed.map((email) => ({ email, fixed: true, addedBy: null, addedAt: null })),
    ...added.filter((a) => !fixed.includes(a.email)).map((a) => ({ email: a.email, fixed: false, addedBy: a.added_by, addedAt: a.added_at })),
    ...byEmail.map((u) => ({ email: u.email ?? (u.tiktok_username ? `@${u.tiktok_username}` : "(no email)"), fixed: false, addedBy: null, addedAt: null, id: u.id, how: u.password_hash ? ("email" as const) : ("tiktok" as const) })),
  ];
}

/**
 * Makes an account that signs in only with email and password an admin (from its Creators panel). Anyone can sign up with
 * any address, so admin goes to the account the admin knows they created, never to an email address.
 */
export async function makeEmailAdmin(id: string, by: string): Promise<boolean> {
  const res = await supabaseRest(`app_users?id=eq.${id}&role=eq.creator&google_sub=is.null&tiktok_open_id=is.null&password_hash=not.is.null&select=email`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ role: "admin" }),
  });
  const [u] = (await res.json()) as { email: string | null }[];
  if (!u) return false;
  await logActivity(by, "Admins", `made ${u.email ?? "an email account"} admin (signs in with email and password)`);
  return true;
}

/** Takes admin away from an email-and-password admin: their account becomes a creator account and their sign-ins end. */
export async function removeEmailAdmin(id: string, by: string): Promise<boolean> {
  const res = await supabaseRest(`app_users?id=eq.${id}&role=eq.admin&google_sub=is.null&select=email`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ role: "creator" }) });
  const [u] = (await res.json()) as { email: string | null }[];
  if (!u) return false;
  await supabaseRest(`app_sessions?user_id=eq.${id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await logActivity(by, "Admins", `removed ${u.email ?? "an email account"} as admin`);
  return true;
}

export type AccountHit = { id: string; userId: string; name: string; email: string | null; handle: string | null; how: string; admin: boolean };

/**
 * Accounts to give admin access to (owner, 3 Nov 2026: pick one instead of typing an email): by name, email, TikTok username
 * or short user ID (RZ-...). Up to 20.
 */
export async function findAccounts(q: string): Promise<AccountHit[]> {
  const text = q.trim().replace(/[%*(),"\\]/g, " ").trim();
  if (text.length < 2) return [];
  type Row = { id: string; role: string; display_name: string | null; email: string | null; login_email: string | null; tiktok_username: string | null; google_sub: string | null; password_hash: string | null };
  const cols = "id,role,display_name,email,login_email,tiktok_username,google_sub,password_hash";
  const like = encodeURIComponent(`*${text}*`);
  const [byText, all] = await Promise.all([
    supabaseRest(`app_users?or=(display_name.ilike.${like},email.ilike.${like},login_email.ilike.${like},tiktok_username.ilike.${like})&select=${cols}&limit=20`).then((r) => r.json() as Promise<Row[]>),
    // A short ID is worked out from the account ID, so it's matched here rather than in the database.
    /[0-9]/.test(text) ? supabaseRest(`app_users?select=${cols}&limit=5000`).then((r) => r.json() as Promise<Row[]>) : Promise.resolve([] as Row[]),
  ]);
  const seen = new Map<string, Row>();
  for (const r of [...byText, ...all.filter((u) => shortIdMatches(u.id, text))]) seen.set(r.id, r);
  return [...seen.values()].slice(0, 20).map((u) => ({
    id: u.id, userId: shortId(u.id), name: u.display_name ?? u.tiktok_username ?? u.email ?? "Rezekii account", email: u.email ?? u.login_email, handle: u.tiktok_username,
    how: [u.google_sub && "Google", u.password_hash && "Email", u.tiktok_username && "TikTok"].filter(Boolean).join(" · ") || "Rezekii", admin: u.role === "admin",
  }));
}

/**
 * Gives admin access to the account the admin picked (owner, 3 Nov 2026), however it signs in. A Google account's role is
 * re-checked at every Google sign-in, so its email also joins the admin list; other accounts keep the role they're given.
 */
export async function grantAdmin(id: string, by: string): Promise<{ ok: true } | { error: string }> {
  type Row = { id: string; role: string; email: string | null; google_sub: string | null; display_name: string | null; tiktok_username: string | null };
  const [u] = (await (await supabaseRest(`app_users?id=eq.${id}&select=id,role,email,google_sub,display_name,tiktok_username&limit=1`)).json()) as Row[];
  if (!u) return { error: "That account no longer exists." };
  if (u.role === "admin") return { error: "This account is already an admin." };
  if (u.google_sub) {
    if (!u.email) return { error: "This Google account has no email address, so it can't be made admin." };
    await supabaseRest("admin_emails?on_conflict=email", json({ email: u.email.toLowerCase(), added_by: by }, "resolution=ignore-duplicates,return=minimal"));
  }
  await supabaseRest(`app_users?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ role: "admin" }) });
  await logActivity(by, "Admins", `made ${u.email ?? (u.tiktok_username ? `@${u.tiktok_username}` : u.display_name ?? "an account")} admin`);
  return { ok: true };
}

/** Emails added in Settings (checked at every Google sign-in, together with the fixed list). */
export async function addedAdminEmails(): Promise<string[]> {
  return ((await (await supabaseRest("admin_emails?select=email")).json()) as { email: string }[]).map((r) => r.email);
}

export async function addAdmin(email: string, by: string): Promise<void> {
  // They become admin the next time they sign in with Google (which also checks the email is verified).
  await supabaseRest("admin_emails?on_conflict=email", json({ email, added_by: by }, "resolution=ignore-duplicates,return=minimal"));
  await logActivity(by, "Admins", `added ${email} as admin`);
}

/** Removes an admin added in Settings. Their account becomes a creator account and their sign-ins end. */
export async function removeAdmin(email: string, by: string): Promise<void> {
  await supabaseRest(`admin_emails?email=eq.${encodeURIComponent(email)}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  const users = (await (await supabaseRest(`app_users?email=eq.${encodeURIComponent(email)}&role=eq.admin&select=id`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ role: "creator" }) })).json()) as { id: string }[];
  for (const u of users) await supabaseRest(`app_sessions?user_id=eq.${u.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await logActivity(by, "Admins", `removed ${email} as admin`);
}

/** The activity log keeps 90 days (run with the daily refresh). */
export async function pruneActivity(): Promise<void> {
  await supabaseRest(`admin_activity?at=lt.${new Date(Date.now() - 90 * 86400_000).toISOString()}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
}
