import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listRecentVideos } from "../../integrations/tiktok/stats.ts";
import { freshTikTokToken, userTikTokOpenId } from "../posting/store.ts";
import { grant, settle, type Row } from "./ledger.ts";
import { addDays, chestsFor, dayOf, dayStart, missionDays, STARTER_DAYS, streakOf, TIERS } from "./rules.ts";

/**
 * Missions on real data (owner, 31 Oct 2026). A mission is ready once Rezekii can see the action really happened (a video on
 * TikTok, a scan saved, a sample asked for, a shop linked); claiming pays once. Daily missions reset at midnight Malaysia time.
 * A day counts towards the streak once any daily mission is claimed; checking in counts. Each streak tier pays the first time.
 * Missions Rezekii can't check yet (WhatsApp verification, overdue samples) aren't offered.
 */

export type Side = "creator" | "seller";
export type MissionState = { id: string; reward: number; state: "todo" | "ready" | "done"; progress?: [number, number] };
export type Board = {
  credits: number;
  streak: number;
  countedToday: boolean;
  /** Monday to Sunday of this week: counted for the streak or not; `today` is its index. */
  week: { on: boolean[]; today: number };
  daily: MissionState[];
  starter: MissionState[];
  /** Days left for starter missions; 0 once they're over (then `starter` is empty). */
  starterLeft: number;
  milestones: MissionState[];
};

type Def = { id: string; reward: number; check: (s: Signals) => boolean | [number, number] };
type Signals = Record<string, number | boolean>;

const CREATOR_DAILY: Def[] = [
  { id: "d1", reward: 5, check: () => true },
  { id: "d2", reward: 20, check: (s) => (s.videosToday as number) >= 1 },
  { id: "d3", reward: 30, check: (s) => [Math.min(3, s.videosToday as number), 3] },
  { id: "d4", reward: 10, check: (s) => !!s.scanToday },
  { id: "d5", reward: 15, check: (s) => !!s.sampleToday },
  { id: "d6", reward: 5, check: (s) => !!s.sharedToday },
];
const CREATOR_STARTER: Def[] = [
  { id: "s1", reward: 50, check: (s) => !!s.profile },
  { id: "s2", reward: 100, check: (s) => !!s.shop },
  { id: "s3", reward: 50, check: (s) => !!s.tiktok },
  { id: "s4", reward: 30, check: (s) => !!s.social },
  { id: "s6", reward: 50, check: (s) => !!s.scanned },
  { id: "s7", reward: 120, check: (s) => !!s.collab },
];
const SELLER_DAILY: Def[] = [
  { id: "d1", reward: 5, check: () => true },
  { id: "d2", reward: 20, check: (s) => (s.videosToday as number) >= 1 },
  { id: "d3", reward: 5, check: (s) => !!s.resultsToday },
  { id: "d4", reward: 20, check: (s) => !!s.passedToday },
  { id: "d5", reward: 5, check: (s) => !!s.sharedToday },
];
const SELLER_STARTER: Def[] = [
  { id: "sm1", reward: 100, check: (s) => !!s.shop },
  { id: "sm2", reward: 50, check: (s) => !!s.profile },
  { id: "sm3", reward: 100, check: (s) => (s.submitted as number) > 0 },
  { id: "sm4", reward: 150, check: (s) => (s.live as number) > 0 },
  { id: "sm5", reward: 30, check: (s) => !!s.social },
  { id: "sm6", reward: 50, check: (s) => !!s.invited },
];
const SELLER_MILESTONES: Def[] = [
  { id: "sm7", reward: 200, check: (s) => [Math.min(10, s.live as number), 10] },
  { id: "sm8", reward: 300, check: (s) => [Math.min(50, s.creators as number), 50] },
];

/** What each mission is called in the credit history. */
const TITLES: Record<Side, Record<string, string>> = {
  creator: { d1: "Check in", d2: "Post a video", d3: "Post 3 videos", d4: "Run a scan", d5: "Request a free sample", d6: "Share a proud moment", s1: "Fill in your profile", s2: "Link TikTok Shop", s3: "Link your TikTok account", s4: "Connect Facebook, Instagram or Threads", s6: "Run your first scan", s7: "Finish your first collaboration" },
  seller: { d1: "Check in", d2: "Post a video for your shop", d3: "Check today's results", d4: "Submit or register a product", d5: "Share a proud moment", sm1: "Connect Seller Center", sm2: "Add your contact name and phone", sm3: "Submit your first products", sm4: "Get your first product live", sm5: "Connect your Facebook Page, Instagram or Threads", sm6: "Invite one seller or creator", sm7: "Have 10 products in TAP", sm8: "50 creators selling your products" },
};

const json = async <T>(path: string): Promise<T[]> => (await supabaseRest(path)).json() as Promise<T[]>;
const inDay = (t: string | null | undefined, day: string) => !!t && dayOf(t) === day;

/** How many videos went up today: on her TikTok (from her phone or Rezekii), or posted through Rezekii to any app. */
async function videosToday(userId: string, today: string): Promise<number> {
  const from = new Date(dayStart(today)).toISOString();
  const [posts, socials] = await Promise.all([
    json<{ id: string }>(`posts?user_id=eq.${userId}&status=eq.posted&posted_at=gte.${from}&select=id`),
    json<{ group_id: string }>(`social_posts?user_id=eq.${userId}&status=eq.posted&tiktok_post_id=is.null&posted_at=gte.${from}&select=group_id`),
  ]);
  const viaRezekii = posts.length + new Set(socials.map((s) => s.group_id)).size;
  let onTikTok = 0;
  const openId = await userTikTokOpenId(userId).catch(() => null);
  if (openId) {
    const token = await freshTikTokToken(openId).catch(() => null);
    const r = token ? await listRecentVideos(token, 20) : null;
    if (r?.data) onTikTok = r.data.filter((v) => v.create_time && dayOf(v.create_time * 1000) === today).length;
    else onTikTok = (await json<{ video_id: string }>(`tiktok_videos?open_id=eq.${encodeURIComponent(openId)}&created_at=gte.${from}&select=video_id`)).length;
  }
  // The same video posted to TikTok through Rezekii shows in both counts, so take the larger, not the sum.
  return Math.max(onTikTok, viaRezekii);
}

async function creatorSignals(user: { id: string }, today: string, events: Set<string>): Promise<Signals> {
  const [conn, tt, social, sample, prof] = await Promise.all([
    json<{ username: string; showcase_at: string | null }>(`affiliate_connections?user_id=eq.${user.id}&select=username,showcase_at&limit=1`),
    json<{ open_id: string }>(`tiktok_connections?user_id=eq.${user.id}&select=open_id&limit=1`),
    json<{ id: string }>(`social_accounts?user_id=eq.${user.id}&select=id&limit=1`),
    json<{ id: string }>(`sample_requests?user_id=eq.${user.id}&created_at=gte.${new Date(dayStart(today)).toISOString()}&select=id&limit=1`),
    json<{ complete: boolean }>(`profiles?user_id=eq.${user.id}&side=eq.creator&complete=is.true&select=complete&limit=1`),
  ]);
  const c = conn[0];
  const collab = c?.username ? (await json<{ product_id: string }>(`tap_creator_products?username=eq.${encodeURIComponent(c.username.toLowerCase())}&sample_status=eq.Completed&select=product_id&limit=1`)).length > 0 : false;
  return {
    videosToday: await videosToday(user.id, today),
    scanToday: inDay(c?.showcase_at, today), scanned: !!c?.showcase_at, sampleToday: sample.length > 0, sharedToday: events.has("share"),
    profile: prof.length > 0, shop: !!c, tiktok: tt.length > 0, social: social.length > 0, collab,
  };
}

async function sellerSignals(user: { id: string }, today: string, events: Set<string>): Promise<Signals> {
  const [shops, subs, social, prof, invited] = await Promise.all([
    json<{ shop_id: string }>(`seller_connections?connected_by=eq.${user.id}&select=shop_id`),
    json<{ product_id: string; status: string; history: { at: string; stage?: string }[] }>(`tap_submissions?submitted_by=eq.${user.id}&select=product_id,status,history&limit=500`),
    json<{ id: string }>(`social_accounts?user_id=eq.${user.id}&select=id&limit=1`),
    json<{ complete: boolean }>(`profiles?user_id=eq.${user.id}&side=eq.seller&complete=is.true&select=complete&limit=1`),
    json<{ friend_id: string }>(`referrals?inviter_id=eq.${user.id}&qualified_at=not.is.null&select=friend_id&limit=1`),
  ]);
  const live = subs.filter((s) => s.status === "live");
  // Creators who made a video, a LIVE or a sale with the shop's TAP products.
  const ids = live.map((s) => s.product_id);
  const creators = ids.length ? new Set((await json<{ username: string }>(`tap_creator_products?product_id=in.(${ids.join(",")})&or=(videos.gt.0,lives.gt.0,paid.gt.0)&select=username&limit=5000`)).map((r) => r.username)).size : 0;
  return {
    videosToday: await videosToday(user.id, today), resultsToday: events.has("results"), sharedToday: events.has("share"),
    // A product counts the day it passes our review.
    passedToday: subs.some((s) => s.history?.some((h) => h.stage === "approved" && inDay(h.at, today))),
    shop: shops.length > 0, profile: prof.length > 0, submitted: subs.length, live: live.length, social: social.length > 0, invited: invited.length > 0, creators,
  };
}

const ref = (kind: "daily" | "once", id: string, day: string) => (kind === "daily" ? `d:${id}:${day}` : `o:${id}`);

function state(def: Def, s: Signals, paid: boolean, open = true): MissionState {
  const r = def.check(s);
  const met = Array.isArray(r) ? r[0] >= r[1] : r;
  return { id: def.id, reward: def.reward, state: paid ? "done" : met && open ? "ready" : "todo", ...(Array.isArray(r) ? { progress: r } : {}) };
}

async function build(user: { id: string; created_at: string }, side: Side, all?: Row[]): Promise<{ board: Board; defs: Record<string, { def: Def; kind: "daily" | "once"; open: boolean }> }> {
  const today = dayOf(Date.now());
  const ledger = all ?? (await settle(user.id, side));
  const paid = new Set(ledger.map((r) => r.ref));
  const events = new Set((await json<{ kind: string }>(`reward_events?user_id=eq.${user.id}&day=eq.${today}&select=kind`)).map((e) => e.kind));
  const s = side === "creator" ? await creatorSignals(user, today, events) : await sellerSignals(user, today, events);
  const startedDaysAgo = (Date.now() - Date.parse(user.created_at)) / 86400_000;
  const starterLeft = Math.max(0, Math.ceil(STARTER_DAYS - startedDaysAgo));
  const [dailyDefs, starterDefs, milestoneDefs] = side === "creator" ? [CREATOR_DAILY, CREATOR_STARTER, []] : [SELLER_DAILY, SELLER_STARTER, SELLER_MILESTONES];
  const defs: Record<string, { def: Def; kind: "daily" | "once"; open: boolean }> = {};
  for (const d of dailyDefs) defs[d.id] = { def: d, kind: "daily", open: true };
  for (const d of starterDefs) defs[d.id] = { def: d, kind: "once", open: starterLeft > 0 };
  for (const d of milestoneDefs) defs[d.id] = { def: d, kind: "once", open: true };

  const days = missionDays(ledger);
  const monday = addDays(today, -((new Date(dayStart(today) + 8 * 3600_000).getUTCDay() + 6) % 7));
  const board: Board = {
    credits: ledger.reduce((t, r) => t + r.amount, 0),
    streak: streakOf(days, today),
    countedToday: days.has(today),
    week: { on: Array.from({ length: 7 }, (_, i) => days.has(addDays(monday, i))), today: Array.from({ length: 7 }, (_, i) => addDays(monday, i)).indexOf(today) },
    daily: dailyDefs.map((d) => state(d, s, paid.has(ref("daily", d.id, today)))),
    // Starter missions already claimed stay listed as done; the rest go once the starter days are over.
    starter: starterDefs.map((d) => state(d, s, paid.has(ref("once", d.id, today)), starterLeft > 0)).filter((m) => starterLeft > 0 || m.state === "done"),
    starterLeft,
    milestones: milestoneDefs.map((d) => state(d, s, paid.has(ref("once", d.id, today)))),
  };
  return { board, defs };
}

export async function missionBoard(user: { id: string; created_at: string }, side: Side): Promise<Board> {
  return (await build(user, side)).board;
}

/** Records a share or a results visit for today's missions. */
export async function recordEvent(userId: string, kind: "share" | "results"): Promise<void> {
  await supabaseRest("reward_events?on_conflict=user_id,kind,day", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, kind, day: dayOf(Date.now()) }),
  });
}

export type Claimed = { board: Board; gained: number; chest: number | null; tier: { days: number; bonus: number } | null };

/** Claims one mission if it's ready, then any bonus chest and streak tier it unlocks. Each pays once. */
export async function claim(user: { id: string; created_at: string }, side: Side, id: string): Promise<Claimed | { error: string }> {
  const today = dayOf(Date.now());
  const first = await build(user, side);
  const hit = first.defs[id];
  const m = [...first.board.daily, ...first.board.starter, ...first.board.milestones].find((x) => x.id === id);
  if (!hit || !m) return { error: "This mission isn't available." };
  if (m.state === "done") return { board: first.board, gained: 0, chest: null, tier: null };
  if (m.state !== "ready") return { error: "Not done yet. Credits come once the action is done." };
  const title = TITLES[side][id] ?? "Mission";
  await grant(user.id, side, { amount: hit.def.reward, kind: "mission", what: `Mission: ${title}`, ref: ref(hit.kind, id, today), day: hit.kind === "daily" ? today : undefined });
  let gained = hit.def.reward;
  let chest: number | null = null;
  let tier: Claimed["tier"] = null;
  if (hit.kind === "daily") {
    const all = await settle(user.id, side);
    const doneToday = all.filter((r) => r.kind === "mission" && r.day === today && r.ref.startsWith("d:")).length;
    for (const c of chestsFor(first.board.daily.length).filter((c) => doneToday >= c.at))
      if (await grant(user.id, side, { amount: c.bonus, kind: "chest", what: `Bonus chest: ${c.at} daily missions`, ref: `chest:${today}:${c.at}`, day: today })) {
        gained += c.bonus;
        chest = (chest ?? 0) + c.bonus;
      }
    const streak = streakOf(missionDays(all), today);
    for (const t of TIERS.filter((t) => streak >= t.days))
      if (await grant(user.id, side, { amount: t.bonus, kind: "streak", what: `Streak: ${t.days} days`, ref: `tier:${t.days}` })) {
        gained += t.bonus;
        tier = t;
      }
  }
  return { board: (await build(user, side)).board, gained, chest, tier };
}
