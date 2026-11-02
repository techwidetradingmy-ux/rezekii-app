import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { CAT } from "../rankings/build.ts";
import { linesBetween } from "../sales/frames.ts";
import { lineGmv, type OrderLine } from "../sales/summary.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const SLOTS: [string, number, number][] = [["6–9 AM", 6, 9], ["9 AM–12 PM", 9, 12], ["12–3 PM", 12, 15], ["3–6 PM", 15, 18], ["6–9 PM", 18, 21], ["9 PM–12 AM", 21, 24], ["12–6 AM", 0, 6]];
const slotOf = (t: number) => { const h = new Date(t + MYT).getUTCHours(); return SLOTS.findIndex(([, a, b]) => h >= a && h < b); };
const enc = encodeURIComponent;
const get = async <T,>(path: string): Promise<T> => (await supabaseRest(path)).json() as Promise<T>;
/** The value `p` of the way along sorted numbers (0.5 = the median), between two neighbours when it falls between them. */
const at = (s: number[], p: number) => { const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Owner, 3 Nov 2026: only videos at least 7 days old (newer ones are still getting views); a time slot needs 3 of them. */
const SETTLED = 7 * DAY;
export const MIN_POSTS = 3;

export type ViewSlot = { label: string; typical: number; lo: number; hi: number; posts: number };
export type MarketSlot = { label: string; share: number; typical: number | null; videos: number };
export type Market = { category: string | null; videos: number; days: number; slots: MarketSlot[] };
export type BestTime = {
  /** Her settled videos by Malaysia time slot (null under 5): typical (median) views and the middle half (25th–75th percentile). */
  views: { days: 30 | 60; test: "better" | "same" | "few"; count: number; slots: ViewSlot[] } | null;
  /** Under 5 settled videos: when her buyers ordered, last 30 days. */
  orders: { count: number; slots: [string, number][] } | null;
  /** When TikTok's best-selling videos in her main category were posted (works for new creators too). */
  market: Market | null;
};

/** A video: when it was posted, its views and its time slot. */
type Video = { t: number; views: number; s: number };

function viewSlots(vs: Video[]): ViewSlot[] {
  const by = SLOTS.map(() => [] as number[]);
  for (const v of vs) if (v.s >= 0) by[v.s].push(v.views);
  return SLOTS.map(([label], i) => {
    const s = sorted(by[i]);
    const ok = s.length >= MIN_POSTS;
    return { label, posts: s.length, typical: ok ? Math.round(at(s, 0.5)) : 0, lo: ok ? Math.round(at(s, 0.25)) : 0, hi: ok ? Math.round(at(s, 0.75)) : 0 };
  });
}

/**
 * 30 or 60 days (owner, 3 Nov 2026): each settled post of the last 30 days (in both windows, so the test is fair) is predicted as
 * the median views of her other posts in the same slot, from the last 30 and from the last 60 days, and the median miss (as a share
 * of its real views, rounded to a whole percent) is compared. A post counts when both windows have 2 other posts in its slot; under
 * 5 such posts, or a tie: 60 days.
 */
function pickDays(vs: Video[], now: number): { days: 30 | 60; test: "better" | "same" | "few" } {
  const in30 = vs.filter((v) => v.t >= now - 30 * DAY);
  const guess = (pool: Video[], v: Video) => { const o = pool.filter((x) => x !== v && x.s === v.s).map((x) => x.views); return o.length >= 2 ? at(sorted(o), 0.5) : null; };
  const miss: [number, number][] = [];
  for (const v of in30) {
    const a = guess(in30, v), b = guess(vs, v);
    if (v.views > 0 && a !== null && b !== null) miss.push([Math.abs(a - v.views) / v.views, Math.abs(b - v.views) / v.views]);
  }
  if (miss.length < 5) return { days: 60, test: "few" };
  const m30 = Math.round(at(sorted(miss.map((m) => m[0])), 0.5) * 100), m60 = Math.round(at(sorted(miss.map((m) => m[1])), 0.5) * 100);
  return m30 < m60 ? { days: 30, test: "better" } : { days: 60, test: m60 < m30 ? "better" : "same" };
}

/** Her settled videos from the last 60 days, from every TikTok account she connected (as saved, no TikTok call). */
async function settledVideos(userId: string, now: number): Promise<Video[]> {
  const conns = await get<{ open_id: string }[]>(`tiktok_connections?user_id=eq.${userId}&select=open_id`);
  if (!conns.length) return [];
  const rows = await get<{ created_at: string; views: number | null }[]>(
    `tiktok_videos?open_id=in.(${conns.map((c) => `"${c.open_id}"`).join(",")})&created_at=gte.${enc(new Date(now - 60 * DAY).toISOString())}&created_at=lte.${enc(new Date(now - SETTLED).toISOString())}&views=not.is.null&select=created_at,views&limit=3000`,
  );
  return rows.map((r) => ({ t: Date.parse(r.created_at), views: Number(r.views), s: slotOf(Date.parse(r.created_at)) }));
}

/**
 * Her main category: TikTok's level-1 category with most of her sales (GMV, last 30 days), from her top 60 products' saved
 * category (product_details.main_category, else tap_catalog.category when it is a level-1 name). Null when none is known.
 */
async function mainCategory(lines: OrderLine[]): Promise<string | null> {
  const gmv = new Map<string, number>();
  for (const l of lines) if (l.product_id && /^\d+$/.test(l.product_id)) gmv.set(l.product_id, (gmv.get(l.product_id) ?? 0) + lineGmv(l));
  const ids = [...gmv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id]) => id).join(",");
  if (!ids) return null;
  const [details, tap] = await Promise.all([
    get<{ product_id: string; main_category: string }[]>(`product_details?product_id=in.(${ids})&main_category=not.is.null&select=product_id,main_category`).catch(() => []),
    get<{ product_id: string; category: string | null }[]>(`tap_catalog?product_id=in.(${ids})&select=product_id,category`).catch(() => []),
  ]);
  const idOf = new Map(Object.entries(CAT).map(([id, name]) => [name.toLowerCase(), id]));
  const catOf = new Map<string, string>();
  for (const r of tap) { const c = idOf.get((r.category ?? "").toLowerCase()); if (c) catOf.set(r.product_id, c); }
  for (const r of details) { const c = idOf.get(r.main_category.toLowerCase()); if (c) catOf.set(r.product_id, c); }
  const sums = new Map<string, number>();
  for (const [id, g] of gmv) { const c = catOf.get(id); if (c) sums.set(c, (sums.get(c) ?? 0) + g); }
  return [...sums.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * TikTok's daily top-100 best-selling videos in Malaysia (RM lists, about 30 days kept), each video once with its newest views,
 * by the Malaysia time it was posted. For a category, a video counts when it sells a product that was in that category's daily
 * top-100 product list on any of those days: the lists are by TikTok's level-1 category id, so this needs no names, and a product
 * stays in one category (owner, 3 Nov 2026: simplest reliable match). Under 20 such videos: every category.
 */
async function buildMarket(cat: string | null): Promise<Market | null> {
  const [lists, products] = await Promise.all([
    get<{ items: Record<string, unknown>[] | null }[]>(`market_snapshots?dataset=eq.videos&slot=eq.${enc("1D|LOCAL")}&select=items&order=as_of.desc&limit=30`),
    cat ? get<{ items: Record<string, unknown>[] | null }[]>(`market_snapshots?dataset=eq.products&slot=eq.${enc(`1D|${cat}|LOCAL`)}&select=items&order=as_of.desc&limit=30`) : Promise.resolve([]),
  ]);
  const seen = new Map<string, Video & { products: string[] }>();
  for (const l of lists)
    for (const v of l.items ?? []) {
      const id = String(v.id ?? ""), t = Number(v.publish_time) * 1000;
      if (!id || !t || seen.has(id)) continue;
      seen.set(id, { t, views: Number(v.views) || 0, s: slotOf(t), products: ((v.product_infos as { product_id?: string }[] | undefined) ?? []).map((p) => String(p.product_id ?? "")) });
    }
  const inCat = new Set(products.flatMap((l) => (l.items ?? []).map((x) => String(x.id ?? ""))));
  const mine = cat ? [...seen.values()].filter((v) => v.products.some((p) => inCat.has(p))) : [];
  const use = mine.length >= 20 ? mine : [...seen.values()];
  if (!use.length) return null;
  const by = SLOTS.map(() => [] as number[]);
  for (const v of use) if (v.s >= 0) by[v.s].push(v.views);
  return {
    category: use === mine ? CAT[cat!] ?? null : null, videos: use.length, days: lists.length,
    slots: SLOTS.map(([label], i) => ({ label, videos: by[i].length, share: Math.round((by[i].length / use.length) * 100), typical: by[i].length >= MIN_POSTS ? Math.round(at(sorted(by[i]), 0.5)) : null })),
  };
}

/** The best-selling videos reference, worked out once per category per daily list and kept in best_time_market. */
async function market(cat: string | null): Promise<Market | null> {
  const key = cat ?? "ALL";
  const [[newest], [hit]] = await Promise.all([
    get<{ as_of: string }[]>(`market_snapshots?dataset=eq.videos&slot=eq.${enc("1D|LOCAL")}&select=as_of&order=as_of.desc&limit=1`),
    get<{ day: string; data: Market }[]>(`best_time_market?key=eq.${key}&select=day,data&limit=1`).catch(() => []),
  ]);
  if (!newest) return null;
  if (hit?.day === newest.as_of) return hit.data;
  const data = await buildMarket(cat);
  if (data)
    await supabaseRest("best_time_market?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key, day: newest.as_of, data, at: new Date().toISOString() }) }).catch(() => undefined);
  return data;
}

/**
 * Best time to post (owner, 3 Nov 2026): her settled videos by time slot (typical views and range, from 30 or 60 days, whichever
 * matched her past posts better), when her buyers ordered when she has under 5, and when best-selling videos in her category were
 * posted. All from saved data: no TikTok calls. The reads run side by side.
 */
export async function bestTime(userId: string): Promise<BestTime> {
  const now = Date.now();
  const lines = linesBetween(userId, now - 30 * DAY, now).catch((): OrderLine[] => []);
  const [videos, ref] = await Promise.all([
    settledVideos(userId, now),
    lines.then(mainCategory).catch(() => null).then(market).catch(() => null),
  ]);
  if (videos.length >= 5) {
    const { days, test } = pickDays(videos, now);
    const use = days === 30 ? videos.filter((v) => v.t >= now - 30 * DAY) : videos;
    return { views: { days, test, count: use.length, slots: viewSlots(use) }, orders: null, market: ref };
  }
  const got = await lines;
  const orders = SLOTS.map(() => new Set<string>());
  for (const l of got) { const i = slotOf(Date.parse(l.created_at)); if (i >= 0) orders[i].add(l.order_id); }
  return { views: null, orders: { count: new Set(got.map((l) => l.order_id)).size, slots: SLOTS.map(([label], i) => [label, orders[i].size]) }, market: ref };
}
