import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { lookupProducts, searchMarketplace, type LookedUpProduct } from "../../integrations/tiktok-shop/creator.ts";
import { CAT, nums } from "../rankings/build.ts";
import { creatorDetail, rankings } from "../rankings/store.ts";
import { lineEarned, lineGmv } from "../sales/summary.ts";
import { allProducts, type TapProduct } from "../tap/catalog.ts";
import { profileOf, type CreatorDetails } from "../rewards/profiles.ts";
import { ratingsOf, salesProfile, showcaseOf, type Channel } from "./mine.ts";

/**
 * AI Picks (owner, 31 Oct 2026): a deep look at her last 30 days, then the products on TikTok Shop that fit her best.
 * - Her account: top categories, price range, average order, video or LIVE, when her buyers order, her gender and race (as
 *   she gave them) and her followers (TikTok's Creator Marketplace profile, when Rezekii has read it).
 * - Worth your effort: commission per video for each product she sold, and single videos that took off.
 * - Picks: TikTok's 30-day best sellers in her main categories, TikTok's marketplace search in her categories and price range,
 *   and Rezekii campaign products (which can also get a free sample), scored on fit. All are products she can add.
 * - Rising in your niche, Creators like you, and Swap out (showcase products that didn't sell in 30 days).
 * Every number comes from TikTok or her own orders; nothing is made up.
 */
const MYT = 8 * 3_600_000;
const pct = (part: number, all: number) => (all > 0 ? Math.round((part / all) * 100) : 0);
const kindOf = (t: string | null) => (/LIVE/i.test(t ?? "") ? "live" : /VIDEO/i.test(t ?? "") ? "video" : "other");
const SLOTS: [string, number, number][] = [["6–9 AM", 6, 9], ["9 AM–12 PM", 9, 12], ["12–3 PM", 12, 15], ["3–6 PM", 15, 18], ["6–9 PM", 18, 21], ["9 PM–12 AM", 21, 24], ["12–6 AM", 0, 6]];
const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const enc = encodeURIComponent;

export type Source = "tiktok" | "market" | "rezekii";
export type Pick = {
  id: string; name: string; shop: string | null; category: string | null; image: string | null; priceLo: number | null; openRate: number | null; silverRate: number | null;
  sold: number; rating: number | null; samples: number; source: Source;
  /** Fit with her, out of 100. Not a forecast. */
  match: number; parts: { category: number; price: number; rate: number; demand: number; rating: number };
  fit: "video" | "live"; video: number; live: number; why: string[];
};
export type Effort = { id: string; name: string; videos: number; lives: number; gmv: number; commission: number; perPost: number; hit: { gmv: number } | null };
export type AiResult = {
  linked: boolean;
  profile: {
    categories: [string, number][]; video: number; price: string | null; aov: number; orders: number; days: number; gmv: number; commission: number;
    hours: [string, number][]; you: { gender: string | null; race: string | null } | null;
    audience: { female: number; male: number; age: string; places: string } | null;
  };
  effort: Effort[]; compared: number; picks: Pick[];
  rising: { category: string; change: number }[];
  peers: { user: string; name: string; img: string | null; followers: number; lo: number; hi: number; video: number }[];
  swap: { count: number; items: { id: string; name: string; img: string | null }[] };
  at: string;
};

/** The newest saved TikTok list (period × main category), with its day. */
async function list(period: "1D" | "7D" | "30D", cat: string, day?: string): Promise<{ day: string; items: Record<string, unknown>[] } | null> {
  const q = `market_snapshots?dataset=eq.products&slot=eq.${enc(`${period}|${cat}|LOCAL`)}${day ? `&as_of=lte.${day}` : ""}&select=as_of,items&order=as_of.desc&limit=1`;
  const [r] = (await (await supabaseRest(q)).json()) as { as_of: string; items: Record<string, unknown>[] }[];
  return r ? { day: r.as_of, items: r.items ?? [] } : null;
}
const gmvOf = (x: Record<string, unknown>) => { const [lo = 0, hi = lo] = nums(x.gmv_range); return (lo + hi) / 2; };

/**
 * Products in TikTok's daily top-100 selling videos over the newest `days` days, with the videos' sales (a video's GMV split
 * evenly between the products in it) and how many of those videos show each product.
 */
export async function videoProducts(days: number): Promise<Map<string, { lo: number; hi: number; videos: number; name: string; day: string }>> {
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.videos&slot=eq.${enc("1D|LOCAL")}&select=as_of,items&order=as_of.desc&limit=${days}`)).json()) as { as_of: string; items: Record<string, unknown>[] }[];
  const out = new Map<string, { lo: number; hi: number; videos: number; name: string; day: string }>();
  for (const r of rows)
    for (const v of r.items ?? []) {
      const ps = (v.product_infos as { product_id?: string; product_name?: string }[] | undefined) ?? [];
      const [lo = 0, hi = lo] = nums(v.gmv_range);
      for (const p of ps) {
        if (!p.product_id) continue;
        const m = out.get(p.product_id) ?? out.set(p.product_id, { lo: 0, hi: 0, videos: 0, name: p.product_name ?? "Product", day: r.as_of }).get(p.product_id)!;
        m.lo += lo / ps.length;
        m.hi += hi / ps.length;
        m.videos += 1;
      }
    }
  return out;
}

/** Top-100 sales in a main category, newest 7 days against the 7 before, from TikTok's daily lists (kept per day). */
const rises = new Map<string, number | null>();
async function riseOf(cat: string): Promise<number | null> {
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.products&slot=eq.${enc(`1D|${cat}|LOCAL`)}&select=as_of,items&order=as_of.desc&limit=14`)).json()) as { as_of: string; items: Record<string, unknown>[] }[];
  if (rows.length < 14) return null;
  const key = `${cat}|${rows[0].as_of}`;
  if (rises.has(key)) return rises.get(key)!;
  const sum = (r: typeof rows) => r.reduce((s, d) => s + (d.items ?? []).reduce((t, x) => t + gmvOf(x), 0), 0);
  const now = sum(rows.slice(0, 7));
  const before = sum(rows.slice(7, 14));
  const change = before > 0 ? Math.round(((now - before) / before) * 100) : null;
  rises.set(key, change);
  return change;
}

/** TikTok's open-collaboration facts (only products she can promote come back), 20 IDs a call, a few calls at once. */
async function lookupMany(token: string, ids: string[]): Promise<Map<string, LookedUpProduct>> {
  const out = new Map<string, LookedUpProduct>();
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));
  for (let i = 0; i < batches.length; i += 3)
    for (const r of await Promise.all(batches.slice(i, i + 3).map((b) => lookupProducts(token, b).catch(() => null)))) for (const p of r?.data?.products ?? []) out.set(p.id, p);
  return out;
}
const leafOf = (p: LookedUpProduct) => p.category_chains?.find((x) => x.is_leaf) ?? p.category_chains?.at(-1);

/**
 * `channel` (owner, 31 Oct 2026): "all" by default; "video" or "live" analyses only her sales from that channel, scores the
 * picks on it, and for video also counts products in TikTok's top-selling videos.
 */
export async function aiPicks(userId: string, token: string, username: string | null, channel: Channel = "all"): Promise<AiResult & { channel: Channel }> {
  const now = Date.now();
  const [prof, showcase, tap, saved] = await Promise.all([
    salesProfile(userId, token, 30, channel),
    showcaseOf(token, 4).catch(() => ({ items: [], more: false })),
    allProducts().catch(() => [] as TapProduct[]),
    profileOf<CreatorDetails>(userId, "creator").catch(() => null),
  ]);
  const { lines, video, live, units, gmv, orders } = prof;
  const inShowcase = new Set(showcase.items.map((p) => p.id));

  // Her account.
  const lo = units.length >= 5 ? units[Math.floor(units.length * 0.1)] : null;
  const hi = units.length >= 5 ? units[Math.min(units.length - 1, Math.ceil(units.length * 0.9) - 1)] : null;
  const commission = lines.reduce((s, l) => s + lineEarned(l), 0);
  const slotOrders = SLOTS.map(() => new Set<string>());
  for (const l of lines) {
    const h = new Date(Date.parse(l.created_at) + MYT).getUTCHours();
    const i = SLOTS.findIndex(([, a, b]) => h >= a && h < b);
    if (i >= 0) slotOrders[i].add(l.order_id);
  }
  const hours = SLOTS.map(([label], i) => [label, slotOrders[i].size] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const mains = [...prof.mains.entries()].sort((a, b) => b[1].share - a[1].share);
  const topMains = mains.filter(([, s]) => s.share >= 0.05).slice(0, 3).map(([c]) => c);
  const detail = username ? await creatorDetail(username.toLowerCase(), 4.08).catch(() => null) : null;

  // Worth your effort: commission per video or LIVE, per product; a single video that took off.
  type Acc = { name: string; posts: Map<string, { gmv: number; live: boolean }>; gmv: number; commission: number };
  const per = new Map<string, Acc>();
  for (const l of lines) {
    if (!l.product_id) continue;
    const a = per.get(l.product_id) ?? per.set(l.product_id, { name: l.product_name ?? "Product", posts: new Map(), gmv: 0, commission: 0 }).get(l.product_id)!;
    const g = lineGmv(l);
    a.gmv += g;
    a.commission += lineEarned(l);
    const k = kindOf(l.content_type);
    if (l.content_id && k !== "other") {
      const p = a.posts.get(l.content_id) ?? a.posts.set(l.content_id, { gmv: 0, live: k === "live" }).get(l.content_id)!;
      p.gmv += g;
    }
  }
  const effort: Effort[] = [...per.entries()]
    .filter(([, a]) => a.posts.size > 0 && a.commission > 0)
    .map(([id, a]) => {
      const posts = [...a.posts.values()];
      const best = posts.reduce((m, p) => (p.gmv > m ? p.gmv : m), 0);
      return {
        id, name: a.name, videos: posts.filter((p) => !p.live).length, lives: posts.filter((p) => p.live).length, gmv: Math.round(a.gmv), commission: Math.round(a.commission * 100) / 100,
        perPost: Math.round((a.commission / posts.length) * 100) / 100,
        // One video or LIVE that took off: RM1,000+ in sales on its own, or nearly all of the product's sales from one post.
        hit: best >= 1000 || (posts.length >= 3 && best >= a.gmv * 0.7 && best >= 300) ? { gmv: Math.round(best) } : null,
      };
    })
    .sort((a, b) => b.perPost - a.perPost)
    .slice(0, 8);

  // Candidates: TikTok's 30-day best sellers in her main categories, TikTok's marketplace search, Rezekii campaign products.
  const mine = prof.products;
  const skip = (id: string) => inShowcase.has(id) || mine.has(id);
  const tapById = new Map(tap.map((p) => [p.id, p]));
  type Raw = { id: string; name: string; shop: string | null; image: string | null; price: number | null; rate: number | null; silver: number | null; sold: number; rating: number | null; samples: number; cat: string | null; leaf: string | null; source: Source };
  const pool = new Map<string, Raw>();
  const put = (r: Raw) => { if (!pool.has(r.id)) pool.set(r.id, r); };
  const fromTap = (t: TapProduct | undefined) => (t ? { rate: t.openRate, silver: t.silverRate, samples: t.samples, source: "rezekii" as const } : null);

  // a. TikTok's 30-day best sellers in her main categories she can promote (TikTok's lookup returns only those).
  const top30 = new Map<string, { rank: number; cat: string; rating: number | null }>();
  for (const c of topMains) {
    const l = await list("30D", c);
    l?.items.forEach((x, i) => { const id = String(x.id ?? ""); if (id && !top30.has(id)) top30.set(id, { rank: i + 1, cat: c, rating: num(x.rating) }); });
  }
  const looked = await lookupMany(token, [...top30.keys()].filter((id) => !skip(id)).slice(0, 150));
  for (const [id, p] of looked) {
    const t = top30.get(id)!;
    put({
      id, name: p.title, shop: p.shop?.name ?? null, image: p.main_image_url ?? null, price: num(p.sales_price?.minimum_amount), rate: p.commission?.rate ?? null, silver: null,
      sold: p.units_sold ?? 0, rating: t.rating, samples: 0, cat: t.cat, leaf: leafOf(p)?.local_name ?? null, source: "tiktok", ...(fromTap(tapById.get(id)) ?? {}),
    });
  }
  // b. TikTok's marketplace search in each of her top leaf categories and price range, best-selling first.
  const topLeaves = [...prof.categories.entries()].filter(([, s]) => s.share >= 0.05).sort((a, b) => b[1].share - a[1].share).slice(0, 3);
  for (const [leaf] of topLeaves) {
    const id = prof.leafIds.get(leaf);
    if (!id) continue;
    const r = await searchMarketplace(token, { categoryIds: [id], priceGe: lo ? Math.max(1, Math.floor(lo / 2)) : undefined, priceLe: hi ? Math.ceil(hi * 2) : undefined, sort: "BEST_SELLERS", pageSize: 50 }).catch(() => null);
    for (const p of r?.data?.products ?? [])
      if (!skip(p.id))
        put({
          id: p.id, name: p.title ?? "Product", shop: p.shop?.name ?? null, image: p.main_image_url ?? null, price: num(p.price?.floor_price), rate: p.commission?.rate ?? null, silver: null,
          sold: p.market_performance?.historical_sold_quantity ?? 0, rating: num(p.review?.overall_score) || null, samples: 0, cat: null, leaf, source: "market", ...(fromTap(tapById.get(p.id)) ?? {}),
        });
  }
  // Video view: products in TikTok's top-selling videos of the last 7 days.
  const inVideos = channel === "video" ? await videoProducts(7).catch(() => new Map<string, { lo: number; hi: number; videos: number }>()) : new Map<string, { lo: number; hi: number; videos: number }>();
  // c. Rezekii campaign products in her leaf categories.
  const herLeaf = new Set([...prof.categories.keys()]);
  const ours = tap.filter((p) => !skip(p.id) && !pool.has(p.id) && p.stock !== 0 && p.category && herLeaf.has(p.category));
  const ourRatings = await ratingsOf(token, ours.slice(0, 60).map((p) => p.id)).catch(() => new Map<string, { score: number; count: number }>());
  for (const t of ours) put({ id: t.id, name: t.name, shop: t.shop, image: t.image, price: t.priceLo, rate: t.openRate, silver: t.silverRate, sold: t.sold, rating: ourRatings.get(t.id)?.score ?? null, samples: t.samples, cat: null, leaf: t.category, source: "rezekii" });
  // Rezekii's own sales count and rate win over TikTok's for its campaign products.
  for (const r of pool.values()) { const t = tapById.get(r.id); if (t) Object.assign(r, { silver: t.silverRate, samples: t.samples, source: "rezekii" as const }); }

  // Score: her category (35), her price range (20), commission (15), how well it sells (20), rating (10).
  const topShare = mains[0]?.[1].share ?? 0;
  const leafTop = Math.max(0, ...[...prof.categories.values()].map((c) => c.share));
  const maxRate = Math.max(1, ...[...pool.values()].map((p) => p.silver ?? p.rate ?? 0));
  const maxSold = Math.max(1, ...[...pool.values()].map((p) => p.sold));
  const allSplit = video + live;
  const picks: Pick[] = [...pool.values()]
    .filter((p) => (p.rating ?? 5) >= 4)
    .map((p) => {
      const mainShare = p.cat ? prof.mains.get(p.cat)?.share ?? 0 : 0;
      const leafShare = p.leaf ? prof.categories.get(p.leaf)?.share ?? 0 : 0;
      const category = Math.round(leafShare > 0 && leafTop ? (leafShare / leafTop) * 35 : topShare ? (mainShare / topShare) * 12 : 0);
      const price = p.price ?? 0;
      const priceFit = lo === null || hi === null ? 10 : price >= lo && price <= hi ? 20 : price >= lo / 2 && price <= hi * 2 ? 10 : 0;
      const rate = Math.round((((p.silver ?? p.rate ?? 0) / maxRate) * 15));
      const vid = inVideos.get(p.id);
      const demand = Math.min(20, Math.round((Math.log10(p.sold + 1) / Math.log10(maxSold + 1)) * 20) + (vid ? 6 : 0));
      const rating = p.rating === null ? 5 : p.rating >= 4.8 ? 10 : p.rating >= 4.5 ? 7 : 4;
      const split = (p.leaf ? prof.categories.get(p.leaf) : undefined) ?? (p.cat ? prof.mains.get(p.cat) : undefined);
      const v = split && split.video + split.live > 0 ? pct(split.video, split.video + split.live) : allSplit ? pct(video, allSplit) : 50;
      const t30 = top30.get(p.id);
      const catName = p.leaf ?? (p.cat ? CAT[p.cat] : null);
      const why = [
        leafShare > 0 ? `${p.leaf} is ${Math.round(leafShare * 100)}% of your sales` : mainShare > 0 && p.cat ? `In ${CAT[p.cat]}, your main category` : null,
        priceFit === 20 ? "In your price range" : null,
        t30 && t30.rank <= 100 ? `Top ${t30.rank <= 10 ? 10 : t30.rank <= 50 ? 50 : 100} on TikTok in ${CAT[t30.cat]}, last 30 days` : null,
        vid ? `In ${vid.videos} of TikTok's top-selling videos this week` : null,
        p.samples > 0 ? "Free sample through Rezekii" : p.source === "rezekii" ? "Rezekii campaign" : null,
        p.rating !== null && p.rating >= 4.8 ? `Rated ${p.rating.toFixed(1)}★` : null,
      ].filter((x): x is string => !!x);
      return {
        id: p.id, name: p.name, shop: p.shop, category: catName ?? null, image: p.image, priceLo: p.price, openRate: p.rate, silverRate: p.silver, sold: p.sold, rating: p.rating, samples: p.samples, source: p.source,
        match: Math.max(1, category + priceFit + rate + demand + rating), parts: { category, price: priceFit, rate, demand, rating },
        fit: v >= 50 ? "video" : "live", video: v, live: 100 - v, why,
      } satisfies Pick;
    })
    .sort((a, b) => b.match - a.match || b.sold - a.sold)
    .slice(0, 40);

  // Rising in your niche: each main category's top-100 sales over the newest 7 days against the 7 days before.
  const rising: AiResult["rising"] = [];
  for (const c of topMains) {
    const change = await riseOf(c);
    if (change !== null) rising.push({ category: CAT[c], change });
  }

  // Creators like you: TikTok's top creators (30 days) whose main category is hers.
  const built = topMains.length ? await rankings().catch(() => null) : null;
  const peers = built
    ? built.creators["30D"]
        .filter((r) => built.details[r[1]]?.c?.[0] === topMains[0] && r[1] !== username?.toLowerCase())
        .filter((r) => { const vs = built.details[r[1]]?.vs ?? -1; return channel === "all" || (channel === "video" ? vs >= 50 : vs >= 0 && vs < 50); })
        .slice(0, 5)
        .map((r) => ({ user: r[1], name: r[2] || r[1], img: built.details[r[1]]?.a ?? null, followers: r[3], lo: r[5], hi: r[6], video: built.details[r[1]]?.vs ?? -1 }))
    : [];

  // Swap out: showcase products she had no orders for in 30 days (low ratings are in Risk Check).
  const idle = showcase.items.filter((p) => !mine.has(p.id));

  const compared = pool.size;
  return {
    linked: true,
    channel,
    profile: {
      categories: mains.filter(([, s]) => s.share >= 0.01).slice(0, 4).map(([c, s]) => [CAT[c] ?? c, Math.round(s.share * 100)]),
      video: allSplit ? pct(video, allSplit) : 0,
      price: lo !== null && hi !== null ? `RM ${Math.round(lo)}–${Math.round(hi)}` : null,
      aov: orders ? Math.round((gmv / orders) * 100) / 100 : 0, orders, days: 30, gmv: Math.round(gmv), commission: Math.round(commission * 100) / 100, hours,
      you: saved ? { gender: saved.details.gender ?? null, race: saved.details.race ?? null } : null,
      audience: detail && (detail.f || detail.m) ? { female: detail.f, male: detail.m, age: detail.age, places: detail.loc } : null,
    },
    effort, compared, picks, rising, peers,
    swap: { count: idle.length, items: idle.slice(0, 5).map((p) => ({ id: p.id, name: p.name, img: p.img })) },
    at: new Date(now).toISOString(),
  };
}
