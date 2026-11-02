import { CREATOR, LIVE_PRODUCTS, MY_SAMPLES, PRODUCTS, bestRate, product, rateFor, type Product } from "./mock";
import { SELLER_CONDS, canGetSample, type Cond } from "./mock-creator1";
import { NICHE_BEST, daily, type Trend } from "./mock-creator2";
import { NOT_YET, ON_IDS, ON_SOLD30, WANTED, wantedFor, type Wanted } from "./mock-showcase";

/**
 * One product as the shared Product page shows it (owner, 29 Oct 2026: every product opens the same page). Covers marketplace
 * products and ones not on Rezekii yet (her showcase, Most Wanted, a pasted link). `tapRate` is null when it isn't on Rezekii.
 */
export type ProductView = {
  id: string;
  name: string;
  shop: string;
  img: string;
  price: number;
  category: string;
  /** TikTok's sub category, once the page has read it (owner, 2 Nov 2026); `category` is then TikTok's main category. */
  sub: string | null;
  rating: number | null;
  /** Total sold on TikTok Shop, when we know it. */
  sold: number | null;
  publicRate: number | null;
  /** Her highest rate now: her target plan if she has one, else the open plan (owner, 30 Oct 2026). */
  nowRate: number | null;
  nowPlan: "Target plan" | "Open plan";
  tapRate: number | null;
  /** Her rate is one admin gave her for this product (owner, 29 Oct 2026). */
  special: { until?: string } | null;
  samples: Product["samples"];
  inShowcase: boolean;
  /** Her own orders of it in the last 30 days, when it's in her showcase. */
  mySold: number | null;
  /** Units sold each day for the last 7 days (sample), oldest first. */
  week: number[];
  wanted: Wanted | null;
  /** It was in Rezekii's Marketplace when she saw it and isn't any more (owner, 2 Nov 2026). */
  gone: boolean;
  /** TikTok refused to add it to her showcase lately (owner, 2 Nov 2026). */
  refused: boolean;
};

/**
 * What a signed-in product page read for each product (owner, 2 Nov 2026): TikTok's rating and main and sub category, the Open
 * Plan rate (percent; null when TikTok has none), products no longer in the Marketplace, and ones TikTok refused for her.
 */
export type LiveFacts = { rating: number | null; reviews: number | null; main: string | null; sub: string | null; open: number | null };
export const LIVE_FACTS = new Map<string, LiveFacts>();
export const LIVE_GONE = new Set<string>();
export const LIVE_REFUSED = new Set<string>();

/**
 * Real products that aren't on Rezekii yet (owner, 31 Oct 2026), found from a pasted link or the wish list board, with how many
 * creators asked for them. Kept for this page visit, like LIVE_PRODUCTS.
 */
export type OffLive = { id: string; name: string; shop: string; img: string | null; price: number; rate: number | null; category: string; sold: number | null };
export type WantedLive = OffLive & { creators: number; videos: number; lives: number; rights: number; week: number; first: string };
export const LIVE_OFF = new Map<string, { product: OffLive; wanted: WantedLive | null }>();
const asWanted = (w: WantedLive): Wanted => ({
  id: w.id, name: w.name, shop: w.shop, img: w.img ?? "/avatars/blank.svg", price: w.price, rate: w.rate, category: w.category,
  creators: w.creators, videos: w.videos, lives: w.lives, rights: w.rights, sold30: 0, week: w.week, first: w.first, status: "New", offers: [],
});

const TRENDS: Trend[] = ["up", "flat", "up"];
const pickTrend = (id: string) => TRENDS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TRENDS.length];

export function productView(id: string): ProductView | null {
  const m = PRODUCTS.find((p) => p.id === id) ?? LIVE_PRODUCTS.get(id);
  const f = LIVE_FACTS.get(id);
  const gone = LIVE_GONE.has(id);
  const refused = LIVE_REFUSED.has(id);
  if (m) {
    // A real product (owner, 30 Oct 2026) has no daily sales line from the API yet, so none is shown. Its rating, categories and
    // Open Plan rate are TikTok's once the page has read them (owner, 2 Nov 2026); until then, what the list knew.
    const real = !PRODUCTS.includes(m);
    const nb = NICHE_BEST.find((b) => b.productId === id);
    const open = real ? (f ? f.open : m.publicRate || null) : bestRate(m).rate;
    return {
      id, name: m.name, shop: m.shop, img: m.img, price: m.price, category: f?.main ?? m.category, sub: f?.sub ?? null, rating: real ? f?.rating ?? (m.rating || null) : m.rating, sold: m.sold,
      publicRate: real ? open : m.publicRate, nowRate: open, nowPlan: real ? "Open plan" : bestRate(m).plan,
      // No longer in the Marketplace: no Rezekii rate and no free sample (owner, 2 Nov 2026).
      tapRate: gone ? null : rateFor(m).rate, special: !gone && rateFor(m).special ? { until: rateFor(m).until } : null, samples: gone ? null : m.samples, inShowcase: !real && ON_IDS.includes(id), mySold: real ? null : ON_SOLD30[id] ?? null,
      week: real ? [] : daily(nb?.weekSold ?? Math.round(m.sold / 26), nb?.trend ?? pickTrend(id)), wanted: null, gone, refused,
    };
  }
  const real = LIVE_OFF.get(id);
  if (real) {
    const r = real.product;
    return {
      id, name: r.name, shop: r.shop, img: r.img ?? "/avatars/blank.svg", price: r.price, category: f?.main ?? r.category, sub: f?.sub ?? null, rating: f?.rating ?? null, sold: r.sold,
      publicRate: r.rate, nowRate: r.rate, nowPlan: "Open plan", tapRate: null, special: null, samples: null, inShowcase: false, mySold: null,
      week: [], wanted: real.wanted ? asWanted(real.wanted) : null, gone, refused,
    };
  }
  const off = NOT_YET.find((s) => s.id === id);
  const w = WANTED.find((x) => x.id === id) ?? null;
  const base = off ?? w;
  if (!base) return null;
  return {
    id, name: base.name, shop: base.shop, img: base.img, price: base.price, category: off?.category ?? w?.category ?? "", sub: null, rating: null, sold: null,
    publicRate: base.rate, nowRate: base.rate, nowPlan: "Open plan", tapRate: null, special: null, samples: null, inShowcase: !!off, mySold: off?.sold ?? null,
    week: daily(Math.max(70, (off?.sold ?? w?.sold30 ?? 300) * 2), pickTrend(id)), wanted: wantedFor(id) ?? null, gone: false, refused: false,
  };
}

/** The free-sample conditions for one product, ticked against Aisyah (Active, 16-day streak, Silver, TikTok Lv.4). */
export function sampleConditions(p: Product): Cond[] {
  const streak = p.samples ?? 0;
  const posting = MY_SAMPLES.find((s) => s.status === "Posting");
  const postingName = posting ? product(posting.productId).name : "";
  const base: Cond[] = [
    { label: "TikTok Shop linked", ok: CREATOR.tiktokShopLinked, you: "Linked as @aisyah.glow", fix: "/app/account#connections" },
    { label: "Basic profile complete (name, state, WhatsApp)", ok: true, you: "Complete", fix: "/app/account#profile" },
    { label: "No overdue samples", ok: true, you: posting ? `${postingName}: ${posting.videos ? "first video posted. On time." : `first video due ${posting.due}.`}` : "None" },
  ];
  // The only extra rule is the streak the seller asks for, if any.
  if (streak > 0) base.push({ label: `Posting ${streak} days in a row`, ok: CREATOR.streak >= streak, you: CREATOR.streak >= streak ? `You're on day ${CREATOR.streak}` : `You're on day ${CREATOR.streak} (${streak - CREATOR.streak} to go)` });
  return [...base, ...(SELLER_CONDS[p.id] ?? [])];
}
export const canRequest = (p: Product) => canGetSample(p.samples);

/** Samples she asked for in this browser tab, so Marketplace, AI Picks and the Product page agree (preview only). */
const REQ = "rz2_sample_requests";
export function requestedSamples(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(REQ) ?? "[]");
  } catch {
    return [];
  }
}
export function markRequested(id: string) {
  try {
    sessionStorage.setItem(REQ, JSON.stringify([...new Set([...requestedSamples(), id])]));
  } catch {}
}
export const productHref = (id: string, opts: { sample?: boolean; join?: boolean } = {}) =>
  `/app/product/${id}${opts.sample ? "?sample=1" : opts.join ? "?join=1" : ""}`;
