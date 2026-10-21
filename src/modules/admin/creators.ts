import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { deleteAccount } from "../accounts/manage.ts";
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
};

type U = AppUser & { google_sub: string | null; created_at: string };
const tally = <T,>(rows: T[], key: (r: T) => string) => rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>());

/** Every creator account with how they sign in, their connections, level, links and samples. */
export async function creatorList(): Promise<CreatorRow[]> {
  const [users, levels, conns, shops, links, samples, access, saved] = await Promise.all([
    supabaseRest(`app_users?role=eq.creator&select=${USER_COLUMNS},google_sub,created_at&order=created_at.desc&limit=5000`).then((r) => r.json() as Promise<U[]>),
    supabaseRest("creator_levels?select=user_id,level,gold_invited&limit=5000").then((r) => r.json() as Promise<{ user_id: string; level: Level; gold_invited: boolean }[]>),
    supabaseRest("tiktok_connections?select=user_id&limit=5000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("affiliate_connections?select=username,user_id&limit=5000").then((r) => r.json() as Promise<{ username: string; user_id: string | null }[]>),
    supabaseRest("tap_links?select=user_id&limit=100000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("sample_requests?status=neq.cancelled&select=user_id&limit=100000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("creator_access?select=user_id,status,reason,requested_at&limit=5000").then((r) => r.json() as Promise<{ user_id: string; status: AccessStatus; reason: string | null; requested_at: string }[]>),
    savedPhotos().catch(() => new Map<string, string>()),
  ]);
  const acc = new Map(access.map((a) => [a.user_id, a]));
  const linkedUsers = new Set(shops.map((x) => x.user_id).filter(Boolean));
  const lv = new Map(levels.map((l) => [l.user_id, l]));
  const connected = new Set(conns.map((c) => c.user_id));
  const linked = new Set(shops.map((s) => s.username.toLowerCase()));
  const l = tally(links, (r) => r.user_id);
  const s = tally(samples, (r) => r.user_id);
  return users.map((u) => ({
    id: u.id,
    handle: u.tiktok_username ? `@${u.tiktok_username}` : (u.email ?? u.display_name ?? "Creator"),
    name: u.display_name ?? u.tiktok_username ?? u.email ?? "Creator",
    // TikTok's photo addresses stop working within ~2 days: Rezekii's saved copy, else the address while it works.
    avatar: photoFor(u.tiktok_username ?? "", u.avatar_url, saved),
    signIn: u.tiktok_open_id ? "Signed in with TikTok" : u.google_sub ? `Signed in with Google${u.email ? ` · ${u.email}` : ""}` : `Signed in with email${u.email ? ` · ${u.email}` : ""}`,
    joined: u.created_at,
    tiktok: connected.has(u.id),
    shop: linkedUsers.has(u.id) || (!!u.tiktok_username && linked.has(u.tiktok_username.toLowerCase())),
    level: lv.get(u.id)?.level ?? "bronze",
    goldInvited: lv.get(u.id)?.gold_invited ?? false,
    links: l.get(u.id) ?? 0,
    samples: s.get(u.id) ?? 0,
    access: acc.get(u.id)?.status ?? "none",
    reason: acc.get(u.id)?.reason ?? null,
    requestedAt: acc.get(u.id)?.requested_at ?? null,
  }));
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

/** The Creators page: every creator, TikTok Shop places used, and the time it was read. */
export async function creatorsPage(): Promise<{ creators: CreatorRow[]; places: number; auto: boolean; now: number }> {
  const [creators, places, auto] = await Promise.all([creatorList(), shopPlacesUsed(), autoApprove()]);
  return { creators, places, auto, now: Date.now() };
}
