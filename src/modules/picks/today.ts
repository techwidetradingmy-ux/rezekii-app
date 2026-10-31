import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { videoProducts } from "./ai.ts";
import { selectProducts, type SelectedProduct } from "../../integrations/tiktok-shop/creator.ts";
import { CAT, nums } from "../rankings/build.ts";
import { allProducts, type TapProduct } from "../tap/catalog.ts";
import { showcaseOf } from "./mine.ts";

/**
 * Today's Ideas (owner, 31 Oct 2026): what's selling most on TikTok Shop right now, so creators can ride the wave.
 * - Marketplace: the products that sold the most (GMV) across TikTok Shop on the newest day TikTok has published (yesterday,
 *   from about 4 PM; the day before until then), all categories, mixed with Rezekii campaign products. Only products she can
 *   add are kept (TikTok's product search returns only those), and not ones already in her showcase.
 * - Showcase: products already in her showcase, ranked by their sales across TikTok (not her own sales): TikTok's GMV for the
 *   day when the product is in TikTok's daily top-100 lists, otherwise the units Rezekii saw it sell in the last day, otherwise
 *   its all-time units.
 * 10 a day; Gold creators see 30.
 */
export type Sales =
  | { kind: "gmv"; lo: number; hi: number; day: string }
  /** Sales from TikTok's top-selling videos: on `day`, or over the last 7 days when `week`. */
  | { kind: "video"; lo: number; hi: number; day: string; videos: number; week: boolean }
  | { kind: "day"; units: number }
  | { kind: "total"; units: number };
export type Idea = {
  id: string; name: string; img: string | null; shop: string | null; category: string | null; rating: number | null; price: number | null;
  /** Commission × 100: TikTok's open rate; for Rezekii campaign products, Rezekii's rate (Bronze gets the open rate). */
  openRate: number | null; silverRate: number | null;
  rezekii: boolean; sample: boolean; sales: Sales;
};
export type TodayIdeas = { source: "market" | "showcase"; channel: "all" | "video"; day: string | null; listAt: string | null; rows: Idea[]; gold: boolean; at: string };

const MYT = 8 * 3_600_000;
const enc = encodeURIComponent;
export const IDEAS = 10;
export const GOLD_IDEAS = 30;

type Hit = { id: string; name: string; shop: string | null; img: string | null; rating: number | null; cat: string | null; lo: number; hi: number };
let lists: { day: string; at: string; checked: number; byId: Map<string, Hit> } | null = null;

/** TikTok's daily best-seller lists for the newest day saved (28 categories × 100, plus the all-category list). */
async function newestLists(): Promise<typeof lists> {
  if (lists && Date.now() - lists.checked < 5 * 60_000) return lists;
  const [top] = (await (await supabaseRest(`market_snapshots?dataset=eq.products&slot=like.${enc("1D|*|LOCAL")}&select=as_of&order=as_of.desc&limit=1`)).json()) as { as_of: string }[];
  if (!top) return null;
  const slots = (await (await supabaseRest(`market_snapshots?dataset=eq.products&as_of=eq.${top.as_of}&slot=like.${enc("1D|*|LOCAL")}&select=slot,fetched_at,items`)).json()) as { slot: string; fetched_at: string; items: Record<string, unknown>[] }[];
  const byId = new Map<string, Hit>();
  let at = "";
  for (const s of slots) {
    if (s.fetched_at > at) at = s.fetched_at;
    const cat = s.slot.split("|")[1];
    for (const x of s.items ?? []) {
      const id = String(x.id ?? "");
      if (!id) continue;
      const [lo = 0, hi = lo] = nums(x.gmv_range);
      const had = byId.get(id);
      byId.set(id, {
        id, name: String(x.name ?? "Product"), shop: (x.shop_name as string) ?? null, img: ((x.product_image as { urls?: string[] } | undefined)?.urls ?? [])[0] ?? null,
        rating: x.rating != null ? Math.round(Number(x.rating) * 10) / 10 : null, cat: cat !== "ALL" ? CAT[cat] ?? null : had?.cat ?? null, lo: Math.max(lo, had?.lo ?? 0), hi: Math.max(hi, had?.hi ?? 0),
      });
    }
  }
  lists = { day: top.as_of, at, checked: Date.now(), byId };
  return lists;
}

/** The newest day TikTok's daily lists are saved for (checked every 5 minutes). */
export async function listDay(): Promise<string | null> {
  return (await newestLists().catch(() => null))?.day ?? null;
}

/** TikTok's product search for up to 20 IDs at a time: only products she can promote come back, with price, rate and sales. */
async function searchIds(token: string, ids: string[]): Promise<Map<string, SelectedProduct>> {
  const out = new Map<string, SelectedProduct>();
  for (let i = 0; i < ids.length; i += 20) {
    const r = await selectProducts(token, ids.slice(i, i + 20)).catch(() => null);
    for (const p of r?.data?.products ?? []) out.set(p.id, p);
  }
  return out;
}

const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const score = (p?: SelectedProduct) => num(p?.review?.overall_score) || null;

function fromSearch(p: SelectedProduct, hit: Hit | undefined, tap: TapProduct | undefined, sales: Sales): Idea {
  return {
    id: p.id, name: p.title ?? hit?.name ?? tap?.name ?? "Product", img: p.main_image_url ?? hit?.img ?? tap?.image ?? null, shop: p.shop?.name ?? hit?.shop ?? tap?.shop ?? null,
    category: tap?.category ?? hit?.cat ?? null, rating: score(p) ?? hit?.rating ?? null, price: num(p.price?.floor_price) ?? tap?.priceLo ?? null,
    openRate: tap?.openRate ?? p.commission?.rate ?? null, silverRate: tap?.silverRate ?? null, rezekii: !!tap, sample: (tap?.samples ?? 0) > 0, sales,
  };
}
const gmvOf = (s: Sales, price: number | null) => (s.kind === "gmv" || s.kind === "video" ? (s.lo + s.hi) / 2 : s.kind === "day" ? s.units * (price ?? 0) : 0);

/**
 * Video view (owner, 31 Oct 2026): the products in TikTok's top-selling videos on the newest day TikTok has published, by the
 * sales of those videos; only ones she can add and doesn't have yet. (TikTok's LIVE lists don't say which products sold.)
 */
async function marketVideoIdeas(token: string, gold: boolean): Promise<TodayIdeas> {
  const want = gold ? GOLD_IDEAS : IDEAS;
  const [vids, show, tap, lists] = await Promise.all([videoProducts(1), showcaseOf(token, 4).catch(() => ({ items: [], more: false })), allProducts().catch(() => [] as TapProduct[]), newestLists()]);
  const inShow = new Set(show.items.map((p) => p.id));
  const tapById = new Map(tap.map((p) => [p.id, p]));
  const cands = [...vids.entries()].filter(([id]) => !inShow.has(id)).sort((a, b) => b[1].lo + b[1].hi - (a[1].lo + a[1].hi));
  const rows: Idea[] = [];
  for (let i = 0; i < cands.length && rows.length < want; i += 20) {
    const batch = cands.slice(i, i + 20);
    const found = await searchIds(token, batch.map(([id]) => id));
    for (const [id, v] of batch) {
      const p = found.get(id);
      if (p && rows.length < want && (p.stock?.quantity ?? 1) > 0) rows.push(fromSearch(p, lists?.byId.get(id), tapById.get(id), { kind: "video", lo: v.lo, hi: v.hi, day: v.day, videos: v.videos, week: false }));
    }
  }
  const day = cands[0]?.[1].day ?? null;
  return { source: "market", channel: "video", day, listAt: lists?.at ?? null, rows, gold, at: new Date().toISOString() };
}

/** Marketplace ideas: TikTok's best sellers she can add, with Rezekii campaign products mixed in (3 of 10, 9 of 30). */
export async function marketIdeas(token: string, gold: boolean, channel: "all" | "video" = "all"): Promise<TodayIdeas> {
  if (channel === "video") return marketVideoIdeas(token, gold);
  const want = gold ? GOLD_IDEAS : IDEAS;
  const [l, show, tap] = await Promise.all([newestLists(), showcaseOf(token, 4).catch(() => ({ items: [], more: false })), allProducts().catch(() => [] as TapProduct[])]);
  const inShow = new Set(show.items.map((p) => p.id));
  const tapById = new Map(tap.map((p) => [p.id, p]));
  // Rezekii campaign products by what they sold across TikTok in about the last day (TikTok's all-time count, read 20+ hours
  // apart); without two reads yet, by all-time units.
  const live = tap.filter((p) => !inShow.has(p.id) && p.stock !== 0);
  const daily = await soldInLastDay(live.map((p) => ({ id: p.id, sold: p.sold, price: p.priceLo })));
  const salesOf = (p: TapProduct): Sales => (daily.has(p.id) ? { kind: "day", units: daily.get(p.id)! } : { kind: "total", units: p.sold });
  const ours = live.sort((a, b) => (daily.has(b.id) ? 1 : 0) - (daily.has(a.id) ? 1 : 0) || gmvOf(salesOf(b), b.priceLo) - gmvOf(salesOf(a), a.priceLo) || b.sold - a.sold);
  const ourSlots = Math.min(Math.round(want * 0.3), ours.length);

  const rows: Idea[] = [];
  const cands = l ? [...l.byId.values()].filter((h) => !inShow.has(h.id)).sort((a, b) => b.lo + b.hi - (a.lo + a.hi)) : [];
  for (let i = 0; i < cands.length && i < 300 && rows.length < want - ourSlots; i += 20) {
    const batch = cands.slice(i, i + 20);
    const found = await searchIds(token, batch.map((h) => h.id));
    for (const h of batch) {
      const p = found.get(h.id);
      if (p && rows.length < want - ourSlots && (p.stock?.quantity ?? 1) > 0) rows.push(fromSearch(p, h, tapById.get(h.id), { kind: "gmv", lo: h.lo, hi: h.hi, day: l!.day }));
    }
  }
  const have = new Set(rows.map((r) => r.id));
  const extra = ours.filter((p) => !have.has(p.id)).slice(0, want - rows.length);
  const found = await searchIds(token, extra.map((p) => p.id));
  for (const p of extra) {
    const s = found.get(p.id);
    const sales = salesOf(p);
    rows.push(s ? fromSearch(s, undefined, p, sales) : { id: p.id, name: p.name, img: p.image, shop: p.shop, category: p.category, rating: null, price: p.priceLo, openRate: p.openRate, silverRate: p.silverRate, rezekii: true, sample: p.samples > 0, sales });
  }
  rows.sort((a, b) => gmvOf(b.sales, b.price) - gmvOf(a.sales, a.price) || (b.sales.kind === "total" ? b.sales.units : 0) - (a.sales.kind === "total" ? a.sales.units : 0));
  return { source: "market", channel: "all", day: l?.day ?? null, listAt: l?.at ?? null, rows: rows.slice(0, want), gold, at: new Date().toISOString() };
}

/** Saves each product's all-time units sold for today, and returns how many sold in about the last day where Rezekii knows. */
export async function soldInLastDay(products: { id: string; sold: number; price: number | null }[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!products.length) return out;
  const today = new Date(Date.now() + MYT).toISOString().slice(0, 10);
  const since = new Date(Date.now() + MYT - 3 * 86_400_000).toISOString().slice(0, 10);
  const ids = products.map((p) => p.id);
  const old: { product_id: string; sold: number; at: string }[] = [];
  for (let i = 0; i < ids.length; i += 150)
    old.push(...((await (await supabaseRest(`product_sold_daily?product_id=in.(${ids.slice(i, i + 150).join(",")})&day=gte.${since}&day=lt.${today}&select=product_id,sold,at&order=at.desc`)).json()) as typeof old));
  const now = Date.now();
  for (const p of products) {
    // The newest earlier read at least 20 hours old, scaled to 24 hours.
    const before = old.find((o) => o.product_id === p.id && now - Date.parse(o.at) >= 20 * 3_600_000);
    if (before && p.sold >= before.sold) out.set(p.id, Math.round(((p.sold - before.sold) * 24 * 3_600_000) / (now - Date.parse(before.at))));
  }
  await supabaseRest("product_sold_daily?on_conflict=product_id,day", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(products.map((p) => ({ product_id: p.id, day: today, sold: p.sold, price: p.price, at: new Date().toISOString() }))),
  }).catch(() => undefined);
  return out;
}

/**
 * Showcase ideas: her showcase products (first 200) ranked by their sales across TikTok. Video view: those in TikTok's
 * top-selling videos over the last 7 days, by those videos' sales.
 */
export async function showcaseIdeas(token: string, gold: boolean, channel: "all" | "video" = "all"): Promise<TodayIdeas> {
  const want = gold ? GOLD_IDEAS : IDEAS;
  const [l, show, tap] = await Promise.all([newestLists(), showcaseOf(token, 4), allProducts().catch(() => [] as TapProduct[])]);
  if (channel === "video") {
    const vids = await videoProducts(7);
    const tapById = new Map(tap.map((p) => [p.id, p]));
    const mine = show.items.filter((s) => vids.has(s.id)).sort((a, b) => vids.get(b.id)!.lo + vids.get(b.id)!.hi - (vids.get(a.id)!.lo + vids.get(a.id)!.hi)).slice(0, want);
    const found = await searchIds(token, mine.map((s) => s.id));
    const rows = mine.map((s): Idea => {
      const v = vids.get(s.id)!;
      const sales: Sales = { kind: "video", lo: v.lo, hi: v.hi, day: v.day, videos: v.videos, week: true };
      const p = found.get(s.id);
      return p ? fromSearch(p, l?.byId.get(s.id), tapById.get(s.id), sales) : { id: s.id, name: s.name, img: s.img, shop: null, category: null, rating: null, price: null, openRate: null, silverRate: null, rezekii: tapById.has(s.id), sample: false, sales };
    });
    return { source: "showcase", channel: "video", day: [...vids.values()][0]?.day ?? null, listAt: l?.at ?? null, rows, gold, at: new Date().toISOString() };
  }
  const tapById = new Map(tap.map((p) => [p.id, p]));
  const found = await searchIds(token, show.items.map((p) => p.id));
  const daily = await soldInLastDay([...found.values()].map((p) => ({ id: p.id, sold: p.market_performance?.historical_sold_quantity ?? 0, price: num(p.price?.floor_price) })));
  const rows = show.items.map((s): Idea & { tier: number; key: number } => {
    const hit = l?.byId.get(s.id);
    const p = found.get(s.id);
    const total = p?.market_performance?.historical_sold_quantity ?? 0;
    const sales: Sales = hit ? { kind: "gmv", lo: hit.lo, hi: hit.hi, day: l!.day } : daily.has(s.id) ? { kind: "day", units: daily.get(s.id)! } : { kind: "total", units: total };
    const idea = p ? fromSearch(p, hit, tapById.get(s.id), sales) : { id: s.id, name: s.name, img: s.img, shop: null, category: hit?.cat ?? null, rating: hit?.rating ?? null, price: null, openRate: null, silverRate: null, rezekii: tapById.has(s.id), sample: false, sales };
    return { ...idea, tier: sales.kind === "total" ? 1 : 0, key: sales.kind === "total" ? total : gmvOf(sales, idea.price) };
  });
  rows.sort((a, b) => a.tier - b.tier || b.key - a.key);
  return { source: "showcase", channel: "all", day: l?.day ?? null, listAt: l?.at ?? null, rows: rows.slice(0, want).map(({ tier: _t, key: _k, ...r }) => r), gold, at: new Date().toISOString() };
}
