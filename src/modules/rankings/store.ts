import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { freshUrl, photoFor, savedPhotos } from "../photos/store.ts";
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
  /** Lists TikTok hadn't published for `asOf` yet, with the earlier day shown instead (e.g. videos: "2026-10-12"). */
  listDays?: Partial<Record<"creators" | "products" | "videos" | "lives", string>>;
  /** TikTok Shop creator levels (0-8) by lower-case username, from the monthly level pass. */
  lv?: Record<string, number>;
};

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return (await supabaseRest(`rpc/${name}`, json(args))).json() as Promise<T>;
}

/** One day's lists for a dataset, grouped by slot ("30D|AFFILIATE|USD", ...). */
async function lists(dataset: string, day: string): Promise<Map<string, Raw[]>> {
  const rows = await rpc<{ slot: string; item: Raw }[]>("rank_items_json", { p_dataset: dataset, p_as_of: day, p_like: "%" });
  const m = new Map<string, Raw[]>();
  for (const r of rows) m.set(r.slot, [...(m.get(r.slot) ?? []), r.item]);
  for (const l of m.values()) l.sort((a, b) => Number(a.rank) - Number(b.rank));
  return m;
}

/** The newest day on or before `day` with saved lists for a dataset, or null. */
async function newestDay(dataset: string, day: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&as_of=lte.${day}&select=as_of&order=as_of.desc&limit=1`)).json()) as { as_of: string }[];
  return row?.as_of ?? null;
}

/** One day's lists for a dataset; when TikTok hasn't published that day yet, the newest earlier day's (noted in `listDays`). */
async function listsOrEarlier(dataset: "creators" | "products" | "videos" | "lives", day: string, listDays: NonNullable<Built["listDays"]>): Promise<Map<string, Raw[]>> {
  const m = await lists(dataset, day);
  if (m.size) return m;
  const earlier = await newestDay(dataset, day);
  if (!earlier || earlier === day) return m;
  listDays[dataset] = earlier;
  return lists(dataset, earlier);
}

/** Daily sums over a window, in chunks so each database call stays well under its time limit. */
async function dailySums(dataset: string, to: string, days: number, chunk: number): Promise<DailySum[]> {
  const merged = new Map<string, DailySum>();
  for (let start = 0; start < days; start += chunk) {
    const from = minus(to, Math.min(days, start + chunk) - 1), until = minus(to, start);
    for (const r of await rpc<DailySum[]>("rank_daily_sums_json", { p_dataset: dataset, p_from: from, p_to: until })) {
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
  const listDays: NonNullable<Built["listDays"]> = {};
  const [cLists, pLists, vLists, lLists] = await Promise.all((["creators", "products", "videos", "lives"] as const).map((d) => listsOrEarlier(d, day, listDays)));
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
  const find = (await rpc<Raw[]>("rank_find_json", {})).map((m) => findRow(m)).sort((a, b) => b[8] - a[8] || b[2] - a[2]);
  const avatarOf = new Map(find.map((f) => [f[0].slice(1), f[7]]));
  // A profile's photo address may have expired while the marketplace list's is newer: use whichever still works.
  for (const [u, d] of Object.entries(details)) if (!freshUrl(d.a) && freshUrl(avatarOf.get(u))) d.a = avatarOf.get(u) ?? null;
  const avatar = (user: string) => freshUrl(details[user]?.a) ?? freshUrl(avatarOf.get(user)) ?? details[user]?.a ?? avatarOf.get(user) ?? null;
  // Video thumbnails: TikTok's video lists have no cover, so each video shows the photo of the product it sells.
  const productImg = new Map(pm.filter((m) => m[5]).map((m) => [m[0], m[5]!]));
  const missing = [...new Set(SLOTS.flatMap((s) => (vLists.get(`${s}|USD`) ?? []).flatMap((v) => ((v.product_infos as Raw[] | undefined) ?? []).map((x) => String(x.product_id ?? "")))))].filter((id) => /^\d{10,25}$/.test(id) && !productImg.has(id));
  for (let i = 0; i < missing.length; i += 150)
    for (const r of (await (await supabaseRest(`tap_catalog?product_id=in.(${missing.slice(i, i + 150).join(",")})&image=not.is.null&select=product_id,image`)).json()) as { product_id: string; image: string }[])
      productImg.set(r.product_id, r.image);

  for (const s of SLOTS) {
    const v = buildVideos(vLists.get(`${s}|LOCAL`) ?? [], vLists.get(`${s}|USD`) ?? [], (id) => productImg.get(id) ?? null);
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

  // Profiles are kept only for creators the Rankings views can show: those in a saved creators list from the last 60 days
  // (owner, 15 Oct 2026). Keeping every profile read for the level pass (12,258 on 15 Oct, 7.7 MB) made this row too large
  // to read in time; the creator panel reads anyone else's profile on its own (creatorDetail).
  const listed = await listedCreators(day);
  for (const s of SLOTS) for (const r of creators[s]) listed.add(r[1]);
  const shown = Object.fromEntries(Object.entries(details).filter(([u]) => listed.has(u)));

  const lv = await savedLevels();
  const built: Built = { asOf: day, rates, dropped, tier1, creators, pm, products, videos, lives, details: shown, find, vid: bv.VID, cbest: bv.CBEST, videoDays: { n: bv.nDays, first: bv.first, last: bv.last }, listDays, lv };
  // Saved in three rows: the product details and the Creator Marketplace list are large (several MB each) and only the
  // Top products and Find creators views need them. The parts go first, so the main row never points at missing parts.
  const save = (slot: string, items: unknown) =>
    supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", json({ dataset: "rankings", slot, as_of: day, items: [items], fetched_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal"));
  await save("built-pm", { pm });
  await save("built-find", { find });
  await save("built", { ...built, pm: [], find: [] });
  cache = { at: Date.now(), data: withPhotos({ ...built, pm: [], find: [] }, await savedPhotos().catch(() => new Map<string, string>())) };
  parts.clear();
  return built;
}

/** Every creator in a saved creators list (any period or type) from the 60 days up to `day`. */
async function listedCreators(day: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (const r of await paged<{ items: Raw[] | null }>(`market_snapshots?dataset=eq.creators&as_of=gte.${minus(day, 59)}&as_of=lte.${day}&select=items&order=as_of,slot`))
    for (const it of r.items ?? []) if (typeof it.user_name === "string") out.add(it.user_name);
  return out;
}

/** One creator's profile read on its own, for a creator outside the Rankings lists (no profile in the built rankings). */
export async function creatorDetail(user: string, rate30: number): Promise<Detail | null> {
  const [r] = (await (await supabaseRest(`market_creators?username=eq.${encodeURIComponent(user)}&detail=not.is.null&select=detail&limit=1`)).json()) as { detail: Raw }[];
  if (!r?.detail || typeof r.detail !== "object" || "error" in r.detail) return null;
  const d = detailOf(r.detail, rate30);
  return { ...d, a: photoFor(user, d.a, await savedPhotos().catch(() => new Map<string, string>())) };
}

/** Every TikTok Shop creator level the level pass has found, by lower-case username (read once per build: a full table scan). */
export async function savedLevels(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const r of await paged<{ username: string | null; tt_level: number }>("market_creators?tt_level=not.is.null&select=username,tt_level&order=creator_key"))
    if (r.username) out[r.username.toLowerCase()] = r.tt_level;
  return out;
}

const emptyDetail = (): Detail => ({ a: null, x: 0, xu: 0, band: "", vg: 0, lg: 0, u: 0, c: [], bio: "", wa: "", em: "", ig: "", com: 0, ev: 0, el: 0, f: 0, m: 0, age: "", loc: "", br: 0, pr: 0, vs: -1, nick: "" });

/**
 * Rezekii's saved creator photos in place of TikTok's photo addresses, which stop working within a day or two (owner, 16 Oct
 * 2026); an address that has stopped working becomes null, so the initials show.
 */
function withPhotos(b: Built, saved: Map<string, string>): Built {
  const details = Object.fromEntries(Object.entries(b.details).map(([u, d]) => [u, { ...d, a: photoFor(u, d.a, saved) }]));
  const lives = Object.fromEntries(Object.entries(b.lives).map(([s, rows]) => [s, rows.map((r) => { const x = [...r] as LiveRow; x[8] = photoFor(r[1], r[8], saved); return x; })])) as Built["lives"];
  return { ...b, details, lives };
}
const findWithPhotos = (find: FindRow[], saved: Map<string, string>): FindRow[] =>
  find.map((f) => { const a = photoFor(f[0].slice(1), f[7], saved); if (a === f[7]) return f; const x = [...f] as FindRow; x[7] = a; return x; });

let cache: { at: number; data: Built | null } | null = null;
type Part = "pm" | "find";
const parts = new Map<string, { at: number; data: unknown }>();

/**
 * The newest built rankings (kept in memory for 10 minutes), or null before the first build. The large parts are loaded only
 * when asked for: "pm" (product details, for Top products) and "find" (the Creator Marketplace list, for Find creators).
 */
export async function rankings(...want: Part[]): Promise<Built | null> {
  if (!cache || Date.now() - cache.at > 10 * 60_000) {
    const [row] = (await (await supabaseRest("market_snapshots?dataset=eq.rankings&slot=eq.built&select=items&order=as_of.desc&limit=1")).json()) as { items: Built[] }[];
    const b = row?.items?.[0] ?? null;
    cache = { at: Date.now(), data: b ? withPhotos(b, await savedPhotos().catch(() => new Map<string, string>())) : null };
  }
  const base = cache.data;
  if (!base) return null;
  const out: Built = { ...base };
  for (const p of want) {
    // Rankings saved before the split keep these parts inside the main row.
    if ((base[p] as unknown[]).length) continue;
    const key = `${base.asOf}|${p}`;
    let hit = parts.get(key);
    if (!hit || Date.now() - hit.at > 10 * 60_000) {
      const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.rankings&slot=eq.built-${p}&as_of=eq.${base.asOf}&select=items&limit=1`)).json()) as { items: Record<Part, unknown>[] }[];
      const data = row?.items?.[0]?.[p] ?? [];
      hit = { at: Date.now(), data: p === "find" ? findWithPhotos(data as FindRow[], await savedPhotos().catch(() => new Map<string, string>())) : data };
      parts.set(key, hit);
    }
    (out as Record<Part, unknown>)[p] = hit.data;
  }
  return out;
}
