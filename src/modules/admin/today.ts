import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { mytDay } from "../refresh/plan.ts";
import { greeting, longDay } from "../today/rules.ts";
import { allAccounts, shopPlacesUsed } from "./accounts.ts";
import { systemHealth, type HealthLine } from "./health.ts";
import { postsBetween, type CalPost, type CalStatus } from "./posts.ts";
import { commission, type Commission } from "./tap.ts";

export type Need = { kind: "failed" | "unconfirmed" | "reconnect"; title: string; detail: string; techwide: boolean; postId?: string };
export type TimelineRow = { handle: string; posts: { time: string; left: number; status: CalStatus; title: string }[] };
export type CreatorWaiting = { id: string; handle: string; name: string; avatar: string | null; tiktok: boolean; at: string };
export type AdminToday = {
  hello: string;
  sub: string;
  nowLeft: number;
  nowLabel: string;
  stats: { posts: number; postsNote: string; linksToday: number; creatorsWaiting: number; samplesWaiting: number; creators: number; creatorsShop: number };
  needs: Need[];
  timeline: TimelineRow[];
  waiting: CreatorWaiting[];
  places: number;
  health: HealthLine[];
  tapLive: number;
  commission: Commission;
};

const MYT = 8 * 3600_000;
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};

/** Everything the admin Today page shows, from Rezekii's own records and the daily refresh. */
export async function adminToday(): Promise<AdminToday> {
  const now = Date.now();
  const dayStart = Date.parse(`${mytDay(now)}T00:00:00Z`) - MYT;
  const startIso = new Date(dayStart).toISOString();
  const endIso = new Date(dayStart + 86400_000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 86400_000).toISOString();
  const [today, recent, accounts, links, samplesWaiting, waitingRows, creators, places, health, tapLive, com, creatorsWaiting] = await Promise.all([
    postsBetween(startIso, endIso),
    postsBetween(twoDaysAgo, new Date(now).toISOString()),
    allAccounts(),
    count(`tap_links?made_at=gte.${startIso}&select=id`),
    count("sample_requests?status=eq.requested&select=id"),
    supabaseRest("creator_access?status=eq.waiting&select=user_id,username,requested_at&order=requested_at&limit=3").then((r) => r.json() as Promise<{ user_id: string; username: string | null; requested_at: string }[]>),
    count("app_users?role=eq.creator&select=id"),
    shopPlacesUsed(),
    systemHealth(),
    count("tap_catalog?select=product_id"),
    commission(),
    count("creator_access?status=eq.waiting&select=user_id"),
  ]);
  const by = (s: CalStatus) => today.filter((p) => p.status === s).length;
  const seen = new Set<string>();
  const posts = [...recent, ...today].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const needs: Need[] = [
    ...posts.filter((p) => p.status === "failed").map((p) => ({ kind: "failed" as const, title: `Failed post · ${p.handle} · ${time(p.at)}`, detail: p.error ?? "TikTok refused the post.", techwide: p.techwide, postId: p.id })),
    ...posts.filter((p) => p.status === "unconfirmed").map((p) => ({ kind: "unconfirmed" as const, title: `Unconfirmed post · ${p.handle} · ${time(p.at)}`, detail: "Sent to TikTok, but TikTok hasn't confirmed it after 30 minutes. Check the account on TikTok first.", techwide: p.techwide, postId: p.id })),
    ...accounts.filter((a) => a.tiktok === "expired").map((a) => ({ kind: "reconnect" as const, title: `Reconnect needed · ${a.handle}`, detail: `TikTok Connection expired.${a.queued ? ` ${a.queued} ${a.queued === 1 ? "post is" : "posts are"} paused until ${a.techwide ? "it is reconnected" : "the owner reconnects"}.` : ""}`, techwide: a.techwide })),
  ];
  const rows = new Map<string, TimelineRow>();
  for (const p of today.sort((a, b) => a.at.localeCompare(b.at))) {
    const row = rows.get(p.openId) ?? { handle: p.handle, posts: [] };
    row.posts.push({ time: time(p.at), left: Math.round(((Date.parse(p.at) - dayStart) / 86400_000) * 1000) / 10, status: p.status, title: p.caption.split("\n")[0].slice(0, 80) });
    rows.set(p.openId, row);
  }
  type U = { id: string; display_name: string | null; email: string | null; avatar_url: string | null };
  const ids = waitingRows.map((w) => w.user_id);
  const [users, conns] = ids.length
    ? await Promise.all([
        supabaseRest(`app_users?id=in.(${ids.join(",")})&select=id,display_name,email,avatar_url`).then((r) => r.json() as Promise<U[]>),
        supabaseRest(`tiktok_connections?user_id=in.(${ids.join(",")})&select=user_id`).then((r) => r.json() as Promise<{ user_id: string }[]>),
      ])
    : [[] as U[], [] as { user_id: string }[]];
  const byId = new Map(users.map((u) => [u.id, u]));
  const withTikTok = new Set(conns.map((c) => c.user_id));
  return {
    hello: `${greeting(now)}, Techwide team`,
    sub: `${longDay(now)} · ${time(new Date(now).toISOString())} Malaysia time`,
    nowLeft: Math.round(((now - dayStart) / 86400_000) * 1000) / 10,
    nowLabel: `Now ${time(new Date(now).toISOString())}`,
    stats: { posts: today.length, postsNote: `${by("published")} published · ${by("scheduled") + by("sending") + by("paused")} scheduled · ${by("failed")} failed`, linksToday: links, creatorsWaiting, samplesWaiting, creators, creatorsShop: places },
    needs,
    timeline: [...rows.values()],
    waiting: waitingRows.map((w) => {
      const u = byId.get(w.user_id);
      return { id: w.user_id, handle: w.username ? `@${w.username}` : (u?.email ?? "Creator"), name: u?.display_name ?? u?.email ?? "", avatar: u?.avatar_url ?? null, tiktok: withTikTok.has(w.user_id), at: w.requested_at };
    }),
    places,
    health: health.lines,
    tapLive,
    commission: com,
  };
}

export type { CalPost };
