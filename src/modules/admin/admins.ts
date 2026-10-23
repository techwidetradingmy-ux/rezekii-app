import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { DEFAULT_ADMINS } from "../accounts/users.ts";

const json = (body: unknown, prefer = "return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });

export type ActivityKind = "Posts" | "Creators" | "Admins" | "Connections" | "TAP";
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

/** `id` is set for admins who sign in with email and password (made admin from Creators), not Google. */
export type AdminRow = { email: string; fixed: boolean; addedBy: string | null; addedAt: string | null; id?: string };

/** Every admin: the fixed list first, then the ones added in Settings, then those who sign in with email and password. */
export async function listAdmins(): Promise<AdminRow[]> {
  const [added, byEmail] = await Promise.all([
    supabaseRest("admin_emails?select=email,added_by,added_at&order=added_at").then((r) => r.json() as Promise<{ email: string; added_by: string | null; added_at: string }[]>),
    supabaseRest("app_users?role=eq.admin&google_sub=is.null&select=id,email&order=created_at").then((r) => r.json() as Promise<{ id: string; email: string | null }[]>),
  ]);
  const fixed = fixedAdmins();
  return [
    ...fixed.map((email) => ({ email, fixed: true, addedBy: null, addedAt: null })),
    ...added.filter((a) => !fixed.includes(a.email)).map((a) => ({ email: a.email, fixed: false, addedBy: a.added_by, addedAt: a.added_at })),
    ...byEmail.map((u) => ({ email: u.email ?? "(no email)", fixed: false, addedBy: null, addedAt: null, id: u.id })),
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
