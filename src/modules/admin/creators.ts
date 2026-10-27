import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { deleteAccount } from "../accounts/manage.ts";
import { ADMIN_PASSWORD_MIN, hashPassword, passwordProblem } from "../accounts/password.ts";
import type { AppUser } from "../accounts/users.ts";
import { USER_COLUMNS } from "../accounts/users.ts";
import type { Level } from "../levels/rules.ts";
import { mytDay } from "../refresh/plan.ts";
import { autoApprove, type AccessStatus } from "../creator-accounts/access.ts";
import { shopPlacesUsed } from "./accounts.ts";
import { logActivity } from "./admins.ts";
import { photoFor, savedPhotos } from "../photos/store.ts";

export type CreatorRow = {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  signIn: string;
  joined: string;
  tiktok: boolean;
  shop: boolean;
  level: Level;
  goldInvited: boolean;
  links: number;
  samples: number;
  /** TikTok Shop approval ("none" = never linked TikTok Shop) */
  access: AccessStatus | "none";
  reason: string | null;
  requestedAt: string | null;
  /** Their email: their Google address, or the email they signed up with. */
  email: string | null;
  /** The email they sign in with, with a password (can differ from a Google address). */
  loginEmail: string | null;
  /** Signs in with Google / with TikTok (@handle) / with email and password. */
  google: boolean;
  tiktokLogin: string | null;
  password: boolean;
  /** TikTok account connected for posting, and the TikTok Shop creator account linked (@handles). */
  tiktokAccount: string | null;
  shopAccount: string | null;
  /** Facebook Pages, Instagram and Threads accounts connected for posting. */
  social: { platform: string; name: string; active: boolean }[];
  lastSignIn: string | null;
  /** Has admin access (can switch to the admin dashboard). */
  admin: boolean;
};

type U = AppUser & { google_sub: string | null; login_email: string | null; created_at: string; last_sign_in_at: string | null };
const tally = <T,>(rows: T[], key: (r: T) => string) => rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>());

/** Every account (admins use the creator pages too) with how they sign in, the accounts they connected, level, links and samples. */
export async function creatorList(): Promise<CreatorRow[]> {
  const [users, levels, conns, shops, links, samples, access, saved, withPassword, socials] = await Promise.all([
    supabaseRest(`app_users?role=in.(creator,admin)&select=${USER_COLUMNS},google_sub,login_email,created_at,last_sign_in_at&order=created_at.desc&limit=5000`).then((r) => r.json() as Promise<U[]>),
    supabaseRest("creator_levels?select=user_id,level,gold_invited&limit=5000").then((r) => r.json() as Promise<{ user_id: string; level: Level; gold_invited: boolean }[]>),
    supabaseRest("tiktok_connections?select=user_id,username&limit=5000").then((r) => r.json() as Promise<{ user_id: string; username: string | null }[]>),
    supabaseRest("affiliate_connections?select=username,user_id&limit=5000").then((r) => r.json() as Promise<{ username: string; user_id: string | null }[]>),
    supabaseRest("tap_links?select=user_id&limit=100000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("sample_requests?status=neq.cancelled&select=user_id&limit=100000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("creator_access?select=user_id,status,reason,requested_at&limit=5000").then((r) => r.json() as Promise<{ user_id: string; status: AccessStatus; reason: string | null; requested_at: string }[]>),
    savedPhotos().catch(() => new Map<string, string>()),
    // Which accounts have a password (the hashes themselves are never read).
    supabaseRest("app_users?role=in.(creator,admin)&password_hash=not.is.null&select=id&limit=5000").then((r) => r.json() as Promise<{ id: string }[]>),
    supabaseRest("social_accounts?select=user_id,platform,name,username,status&order=connected_at&limit=5000").then((r) => r.json() as Promise<{ user_id: string; platform: string; name: string | null; username: string | null; status: string }[]>),
  ]);
  const acc = new Map(access.map((a) => [a.user_id, a]));
  const lv = new Map(levels.map((l) => [l.user_id, l]));
  const tiktokOf = new Map(conns.map((c) => [c.user_id, c.username]));
  const shopOf = new Map(shops.filter((x) => x.user_id).map((x) => [x.user_id as string, x.username]));
  const linked = new Set(shops.map((s) => s.username.toLowerCase()));
  const pw = new Set(withPassword.map((u) => u.id));
  const social = new Map<string, CreatorRow["social"]>();
  for (const a of socials) social.set(a.user_id, [...(social.get(a.user_id) ?? []), { platform: a.platform, name: a.name ?? (a.username ? `@${a.username}` : a.platform), active: a.status === "active" }]);
  const at = (h: string | null | undefined) => (h ? `@${h.replace(/^@/, "")}` : null);
  const l = tally(links, (r) => r.user_id);
  const s = tally(samples, (r) => r.user_id);
  return users.map((u) => {
    const shopAccount = at(shopOf.get(u.id)) ?? (u.tiktok_username && linked.has(u.tiktok_username.toLowerCase()) ? at(u.tiktok_username) : null);
    return {
    id: u.id,
    handle: u.tiktok_username ? `@${u.tiktok_username}` : (u.email ?? u.display_name ?? "Creator"),
    name: u.display_name ?? u.tiktok_username ?? u.email ?? "Creator",
    // TikTok's photo addresses stop working within ~2 days: Rezekii's saved copy, else the address while it works.
    avatar: photoFor(u.tiktok_username ?? "", u.avatar_url, saved),
    signIn: u.tiktok_open_id ? "Signed in with TikTok" : u.google_sub ? `Signed in with Google${u.email ? ` · ${u.email}` : ""}` : `Signed in with email${u.email ? ` · ${u.email}` : ""}`,
    joined: u.created_at,
    tiktok: tiktokOf.has(u.id),
    shop: !!shopAccount,
    level: lv.get(u.id)?.level ?? "bronze",
    goldInvited: lv.get(u.id)?.gold_invited ?? false,
    links: l.get(u.id) ?? 0,
    samples: s.get(u.id) ?? 0,
    access: acc.get(u.id)?.status ?? "none",
    reason: acc.get(u.id)?.reason ?? null,
    requestedAt: acc.get(u.id)?.requested_at ?? null,
    email: u.email,
    loginEmail: u.login_email,
    google: !!u.google_sub,
    tiktokLogin: u.tiktok_open_id ? at(u.tiktok_username) ?? "TikTok" : null,
    password: pw.has(u.id),
    tiktokAccount: tiktokOf.has(u.id) ? at(tiktokOf.get(u.id)) ?? "Connected" : null,
    shopAccount,
    social: social.get(u.id) ?? [],
    lastSignIn: u.last_sign_in_at,
    admin: u.role === "admin",
    };
  });
}

async function creator(id: string): Promise<U | null> {
  const [u] = (await (await supabaseRest(`app_users?id=eq.${encodeURIComponent(id)}&role=eq.creator&select=${USER_COLUMNS},google_sub,created_at&limit=1`)).json()) as U[];
  return u ?? null;
}
const handleOf = (u: U) => (u.tiktok_username ? `@${u.tiktok_username}` : (u.email ?? u.display_name ?? "a creator"));

/**
 * Invite to Gold (or withdraw the invitation). Inviting makes them Gold now; a withdrawn invitation takes effect at the
 * next daily level update, which puts them back on Silver or Bronze by their sales.
 */
export async function setGoldInvite(id: string, invited: boolean, actor: string): Promise<boolean> {
  const u = await creator(id);
  if (!u) return false;
  const row = invited ? { user_id: id, gold_invited: true, level: "gold", level_since: mytDay(Date.now()) } : { user_id: id, gold_invited: false };
  await supabaseRest("creator_levels?on_conflict=user_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }) });
  await logActivity(actor, "Creators", invited ? `invited ${handleOf(u)} to Gold` : `withdrew ${handleOf(u)}'s Gold invitation`);
  return true;
}

/** Removes a creator's Rezekii account and everything in it (as when they delete it themselves). */
export async function removeCreator(id: string, actor: string): Promise<boolean> {
  const u = await creator(id);
  if (!u) return false;
  await deleteAccount(u);
  await logActivity(actor, "Creators", `removed ${handleOf(u)}'s Rezekii account`);
  return true;
}

/**
 * Sets a new password for an account that signs in with email and password (a creator, or an admin made from one), e.g. when
 * they forgot it. Admin accounts need 12 characters. Their other sign-ins end, except the admin's own. Never logged.
 */
export async function setPasswordFor(id: string, password: unknown, actor: { id: string; name: string }): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const [u] = (await (await supabaseRest(`app_users?id=eq.${id}&password_hash=not.is.null&select=id,role,email&limit=1`)).json()) as { id: string; role: string; email: string | null }[];
  if (!u) return { ok: false, error: "This account doesn't sign in with email and password.", status: 404 };
  const problem = passwordProblem(password, u.role === "admin" ? ADMIN_PASSWORD_MIN : undefined);
  if (problem) return { ok: false, error: problem, status: 400 };
  await supabaseRest(`app_users?id=eq.${u.id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ password_hash: await hashPassword(String(password)), failed_logins: 0, locked_until: null }) });
  if (u.id !== actor.id) await supabaseRest(`app_sessions?user_id=eq.${u.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await logActivity(actor.name, u.role === "admin" ? "Admins" : "Creators", `set a new password for ${u.email ?? "an account"}`);
  return { ok: true };
}

/** The Creators page: every creator, TikTok Shop places used, and the time it was read. */
export async function creatorsPage(): Promise<{ creators: CreatorRow[]; places: number; auto: boolean; now: number }> {
  const [creators, places, auto] = await Promise.all([creatorList(), shopPlacesUsed(), autoApprove()]);
  return { creators, places, auto, now: Date.now() };
}
