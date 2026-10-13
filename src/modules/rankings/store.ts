import { supabaseRest } from "../../integrations/supabase/rest.ts";
import {
  SLOTS, TYPES, bestVideos, buildCreators, buildLives, buildProducts, buildVideos, detailOf, findRow,
  type BestVideo, type CreatorRow, type DailySum, type Detail, type FindRow, type LiveRow, type ProductMeta, type ProductRow, type Raw, type Slot, type VideoDay, type VideoRow,
} from "./build.ts";

const json = (body: unknown, prefer = "return=representation"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });
const DAY = 86_400_000;
const minus = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);

/** Everything the Rankings page shows from TikTok, built once a day. */
export type Built = {
  asOf: string;
  rates: Record<string, Partial<Record<Slot, number>>>;
  dropped: Record<string, Partial<Record<Slot, number>>>;
  tier1: Record<Slot, number>;
  creators: Record<Slot, CreatorRow[]>;
  pm: ProductMeta[];
  products: Record<Slot, ProductRow[]>;
  videos: Record<Slot, VideoRow[]>;
  lives: Record<Slot, LiveRow[]>;
  details: Record<string, Detail>;
  find: FindRow[];
  vid: Record<string, BestVideo>;
  cbest: Record<string, string>;
  videoDays: { n: number; first: string | null; last: string | null };
};

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return (await supabaseRest(`rpc/${name}`, json(args))).json() as Promise<T>;
}

/** One day's lists for a dataset, grouped by slot ("30D|AFFILIATE|USD", ...). */
async function lists(dataset: string, day: string): Promise<Map<string, Raw[]>> {
  const rows = await rpc<{ slot: string; item: Raw }[]>("rank_items", { p_dataset: dataset, p_as_of: day, p_like: "%" });
  const m = new Map<string, Raw[]>();
  for (const r of rows) m.set(r.slot, [...(m.get(r.slot) ?? []), r.item]);
  for (const l of m.values()) l.sort((a, b) => Number(a.rank) - Number(b.rank));
  return m;
}

/** Daily sums over a window, in chunks so each database call stays well under its time limit. */
async function dailySums(dataset: string, to: string, days: number, chunk: number): Promise<DailySum[]> {
  const merged = new Map<string, DailySum>();
  for (let start = 0; start < days; start += chunk) {
    const from = minus(to, Math.min(days, start + chunk) - 1), until = minus(to, start);
    for (const r of await rpc<DailySum[]>("rank_daily_sums", { p_dataset: dataset, p_from: from, p_to: until })) {
      const m = merged.get(r.id);
      if (!m) merged.set(r.id, { ...r, lo: Number(r.lo), hi: Number(r.hi) });
      else Object.assign(m, { lo: m.lo + Number(r.lo), hi: m.hi + Number(r.hi), conv: m.conv || r.conv, days: m.days + r.days, grp: m.grp < r.grp ? m.grp : r.grp });
    }
  }
  return [...merged.values()];
}

async function paged<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`${path}&offset=${offset}&limit=1000`)).json()) as T[];
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

/** Builds the rankings from the lists saved for `day` (TikTok's newest data date) and saves them. */
export async function buildRankings(day: string): Promise<Built> {
  const [cLists, pLists, vLists, lLists] = await Promise.all([lists("creators", day), lists("products", day), lists("videos", day), lists("lives", day)]);
  const [c7, c30] = await Promise.all([dailySums("creators", day, 7, 7), dailySums("creators", day, 30, 30)]);
  // Products: one pass over 30 days in 5-day chunks; the first 7 days are also the 7-day figures.
  const p7 = await dailySums("products", day, 7, 5);
  const pRest = await dailySums("products", minus(day, 7), 23, 5);
  const p30 = new Map(p7.map((r) => [r.id, { ...r }]));
  for (const r of pRest) {
    const m = p30.get(r.id);
    if (!m) p30.set(r.id, r);
    else Object.assign(m, { lo: m.lo + r.lo, hi: m.hi + r.hi, conv: m.conv || r.conv, days: m.days + r.days });
  }

  const rates: Built["rates"] = { creators: {}, products: {}, videos: {}, lives: {} };
  const dropped: Built["dropped"] = { creators: {}, products: {}, videos: {}, lives: {} };
  const creators = {} as Built["creators"], products = {} as Built["products"], videos = {} as Built["videos"], lives = {} as Built["lives"];
  const tier1 = {} as Built["tier1"];
  const pm: ProductMeta[] = [];
  const pidx = new Map<string, number>();
  const pair = (m: Map<string, Raw[]>, prefix: string) => ({ L: m.get(`${prefix}|LOCAL`) ?? [], U: m.get(`${prefix}|USD`) ?? [] });

  for (const s of SLOTS) {
    const c = buildCreators(Object.fromEntries(TYPES.map((t) => [t, pair(cLists, `${s}|${t}`)])), s === "7D" ? c7 : s === "30D" ? c30 : null);
    creators[s] = c.rows;
    tier1[s] = c.tier1;
    rates.creators[s] = Math.round(c.rate * 1e4) / 1e4;
    dropped.creators[s] = c.dropped;
    const catLists = Object.fromEntries([...pLists.keys()].filter((k) => k.startsWith(`${s}|`) && !k.includes("|ALL|")).map((k) => k.split("|")[1]).map((cat) => [cat, pair(pLists, `${s}|${cat}`)]));
    const p = buildProducts(catLists, s === "7D" ? p7 : s === "30D" ? [...p30.values()] : null, pm, pidx);
    products[s] = p.rows;
    rates.products[s] = Math.round(p.rate * 1e4) / 1e4;
    dropped.products[s] = p.dropped;
  }

  const rate30 = rates.creators["30D"] || 4.08;
  const detailRows = await paged<{ username: string; detail: Raw }>("market_creators?detail=not.is.null&select=username,detail&order=username");
  const details: Record<string, Detail> = {};
  for (const r of detailRows) if (r.username && r.detail && typeof r.detail === "object" && !("error" in r.detail)) details[r.username] = detailOf(r.detail, rate30);
  const find = (await rpc<{ m: Raw }[]>("rank_find", {})).map((r) => findRow(r.m, rate30)).sort((a, b) => b[8] - a[8] || b[2] - a[2]);
  const avatarOf = new Map(find.map((f) => [f[0].slice(1), f[7]]));
  const avatar = (user: string) => details[user]?.a ?? avatarOf.get(user) ?? null;

  for (const s of SLOTS) {
    const v = buildVideos(vLists.get(`${s}|LOCAL`) ?? [], vLists.get(`${s}|USD`) ?? []);
    videos[s] = v.rows;
    rates.videos[s] = Math.round(v.rate * 1e4) / 1e4;
    dropped.videos[s] = v.dropped;
    const l = buildLives(lLists.get(`${s}|LOCAL`) ?? [], lLists.get(`${s}|USD`) ?? [], avatar);
    lives[s] = l.rows;
    rates.lives[s] = Math.round(l.rate * 1e4) / 1e4;
    dropped.lives[s] = l.dropped;
  }
  for (const s of SLOTS) for (const r of creators[s]) if (!details[r[1]] && avatarOf.get(r[1])) details[r[1]] = { ...emptyDetail(), a: avatarOf.get(r[1]) ?? null };

  // TikTok's daily top-100 video lists from every saved day, for each creator's best-selling video and its daily figures.
  const vdays = await paged<{ as_of: string; slot: string; items: Raw[] }>(`market_snapshots?dataset=eq.videos&slot=in.(${encodeURIComponent("1D|LOCAL")},${encodeURIComponent("1D|USD")})&as_of=gte.${minus(day, 59)}&select=as_of,slot,items&order=as_of`);
  const byDay = new Map<string, VideoDay>();
  for (const r of vdays) {
    const d = byDay.get(r.as_of) ?? { day: r.as_of, L: [], U: [] };
    if (r.slot.endsWith("USD")) d.U = r.items;
    else d.L = r.items;
    byDay.set(r.as_of, d);
  }
  const bv = bestVideos([...byDay.values()], details, videos["30D"]);

  const built: Built = { asOf: day, rates, dropped, tier1, creators, pm, products, videos, lives, details, find, vid: bv.VID, cbest: bv.CBEST, videoDays: { n: bv.nDays, first: bv.first, last: bv.last } };
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", json({ dataset: "rankings", slot: "built", as_of: day, items: [built], fetched_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal"));
  cache = { at: Date.now(), data: built };
  return built;
}

const emptyDetail = (): Detail => ({ a: null, x: 0, xu: 0, band: "", vg: 0, lg: 0, u: 0, c: [], bio: "", wa: "", em: "", ig: "", com: 0, ev: 0, el: 0, f: 0, m: 0, age: "", loc: "", br: 0, pr: 0, vs: -1, nick: "" });

let cache: { at: number; data: Built | null } | null = null;
/** The newest built rankings (kept in memory for 10 minutes), or null before the first build. */
export async function rankings(): Promise<Built | null> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const [row] = (await (await supabaseRest("market_snapshots?dataset=eq.rankings&slot=eq.built&select=items&order=as_of.desc&limit=1")).json()) as { items: Built[] }[];
  cache = { at: Date.now(), data: row?.items?.[0] ?? null };
  return cache.data;
}
