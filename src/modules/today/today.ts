import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { allProducts, type TapProduct } from "../tap/catalog.ts";
import { myTapRows } from "../tap/mytap.ts";
import { listPosts } from "../posting/store.ts";
import { mytDay } from "../refresh/plan.ts";
import { bestSelling, closingSoon, creatorCategories, greeting, longDay, pickForYou, postWhen, weekDelta, type ClosingSoon, type TodayPick } from "./rules.ts";

export type TodayStat = { key: "links" | "showcase" | "samples" | "open"; value: number; delta: string; note: string };
export type NextPost = { title: string; when: string; status: string; tone: "green" | "blue" | "amber" | "red"; posted: boolean };
export type TodayData = {
  now: number;
  /** "Good morning" etc. and "Saturday, 14 October", Malaysia time */
  hello: string;
  day: string;
  stats: TodayStat[];
  picks: TodayPick[];
  basis: string;
  camp: ClosingSoon | null;
  best: [string[], string[]];
  products: TapProduct[];
  nextPosts: NextPost[];
  requestedIds: string[];
  asOf: string | null;
};

const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};

async function linkCounts(userId: string, now: number): Promise<[number, number]> {
  const iso = (n: number) => new Date(now - n * 86400_000).toISOString();
  return Promise.all([
    count(`tap_links?user_id=eq.${userId}&made_at=gte.${iso(7)}&select=id`),
    count(`tap_links?user_id=eq.${userId}&made_at=gte.${iso(14)}&made_at=lt.${iso(7)}&select=id`),
  ]);
}

/** Products that joined the Marketplace in the last 7 days, or null while the catalog is younger than a week. */
async function newThisWeek(now: number): Promise<number | null> {
  const [oldest] = (await (await supabaseRest("tap_catalog?select=first_seen&order=first_seen.asc&limit=1")).json()) as { first_seen: string }[];
  const weekAgo = mytDay(now, 7);
  if (!oldest || oldest.first_seen > weekAgo) return null;
  return count(`tap_catalog?first_seen=gt.${weekAgo}&select=product_id`);
}

function nextPostsFrom(posts: Awaited<ReturnType<typeof listPosts>>, now: number): NextPost[] {
  const title = (caption: string) => caption.split("\n")[0].trim().slice(0, 80) || "Untitled video";
  const upcoming = posts
    .filter((p) => ["scheduled", "publishing", "processing", "failed"].includes(p.status) && p.scheduled_at)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  const done = posts
    .filter((p) => (p.status === "posted" || p.status === "sent_to_inbox") && (p.posted_at || p.scheduled_at))
    .sort((a, b) => Date.parse(b.posted_at ?? b.scheduled_at!) - Date.parse(a.posted_at ?? a.scheduled_at!));
  const look = (s: string): [string, NextPost["tone"]] =>
    s === "scheduled" ? ["Scheduled", "green"] : s === "failed" ? ["Failed", "red"] : s === "posted" ? ["Posted", "blue"] : s === "sent_to_inbox" ? ["In TikTok inbox", "blue"] : ["Sending", "amber"];
  return [...upcoming.slice(0, 3), ...done].slice(0, 3).map((p) => {
    const posted = p.status === "posted" || p.status === "sent_to_inbox";
    const [status, tone] = look(p.status);
    return { title: title(p.caption), when: postWhen(Date.parse((posted ? p.posted_at : null) ?? p.scheduled_at!), now, posted), status, tone, posted };
  });
}

/** Everything the Today page shows for one creator, from Rezekii's own data and Techwide's TAP campaigns. */
export async function todayData(user: { id: string; tiktok_username: string | null }): Promise<TodayData> {
  const now = Date.now();
  const [all, tap, links, fresh, posts] = await Promise.all([allProducts(), myTapRows(user.id, user.tiktok_username), linkCounts(user.id, now), newThisWeek(now), listPosts(user.id, 50)]);
  const categoryOf = new Map(all.map((p) => [p.id, p.category]));
  const { top, niche } = creatorCategories(tap.rows, categoryOf);
  const promoted = new Set(tap.rows.filter((r) => r.campaignId).map((r) => r.productId));
  const picks = pickForYou(all, top, niche, promoted);
  const best: [string[], string[]] = [bestSelling(all, 0), bestSelling(all, 1)];
  const wanted = new Set([...picks.map(([id]) => id), ...best[0], ...best[1]]);
  const onTikTok = tap.rows.filter((r) => r.campaignId);
  const samples = tap.rows.filter((r) => r.stage >= 1 && r.stage <= 3);
  const others = niche.size - 1;

  return {
    now,
    hello: greeting(now),
    day: longDay(now),
    stats: [
      { key: "links", value: links[0], delta: weekDelta(links[0], links[1]), note: links[1] ? "vs last week" : "made in the last 7 days" },
      { key: "showcase", value: onTikTok.length, delta: "", note: "from Techwide TAP campaigns" },
      { key: "samples", value: samples.length, delta: "", note: `${samples.filter((r) => r.stage === 1).length} requested · ${samples.filter((r) => r.stage === 3).length} to post` },
      { key: "open", value: all.length, delta: fresh ? `+${fresh}` : "", note: fresh === null ? "in Techwide's live campaigns" : "new this week" },
    ],
    picks,
    basis: top
      ? `Picked from the categories you promote (${top}${others > 0 ? ` and ${others} more` : ""}) and what is selling on TikTok Shop right now.`
      : "Picked from what is selling on TikTok Shop right now. Promote a few TAP products and these picks follow your own categories.",
    camp: closingSoon(all, Math.floor(now / 1000)),
    best,
    products: all.filter((p) => wanted.has(p.id)),
    nextPosts: nextPostsFrom(posts, now),
    requestedIds: tap.rows.filter((r) => r.request && (r.request.status === "requested" || r.request.status === "applied")).map((r) => r.productId),
    asOf: all[0]?.asOf ?? null,
  };
}
