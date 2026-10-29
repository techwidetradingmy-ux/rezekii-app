import { CREATOR, MY_SAMPLES, PRODUCTS, product, type Product } from "./mock";
import { SAMPLE_ACCESS, SELLER_CONDS, type Cond, type Pool } from "./mock-creator1";
import { NICHE_BEST, daily, type Trend } from "./mock-creator2";
import { NOT_YET, ON_IDS, WANTED, wantedFor, type Wanted } from "./mock-showcase";

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
  rating: number | null;
  /** Total sold on TikTok Shop, when we know it. */
  sold: number | null;
  publicRate: number | null;
  tapRate: number | null;
  samples: Product["samples"];
  inShowcase: boolean;
  /** Her own orders of it in the last 30 days, when it's in her showcase but not on Rezekii. */
  mySold: number | null;
  /** Units sold each day for the last 7 days (sample), oldest first. */
  week: number[];
  wanted: Wanted | null;
};

const TRENDS: Trend[] = ["up", "flat", "up"];
const pickTrend = (id: string) => TRENDS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TRENDS.length];

export function productView(id: string): ProductView | null {
  const m = PRODUCTS.find((p) => p.id === id);
  if (m) {
    const nb = NICHE_BEST.find((b) => b.productId === id);
    return {
      id, name: m.name, shop: m.shop, img: m.img, price: m.price, category: m.category, rating: m.rating, sold: m.sold,
      publicRate: m.publicRate, tapRate: m.tapRate, samples: m.samples, inShowcase: ON_IDS.includes(id), mySold: null,
      week: daily(nb?.weekSold ?? Math.round(m.sold / 26), nb?.trend ?? pickTrend(id)), wanted: null,
    };
  }
  const off = NOT_YET.find((s) => s.id === id);
  const w = WANTED.find((x) => x.id === id) ?? null;
  const base = off ?? w;
  if (!base) return null;
  return {
    id, name: base.name, shop: base.shop, img: base.img, price: base.price, category: off?.category ?? w?.category ?? "", rating: null, sold: null,
    publicRate: base.rate, tapRate: null, samples: null, inShowcase: !!off, mySold: off?.sold ?? null,
    week: daily(Math.max(70, (off?.sold ?? w?.sold30 ?? 300) * 2), pickTrend(id)), wanted: wantedFor(id) ?? null,
  };
}

/** The free-sample conditions for one product, ticked against Aisyah (Active, 16-day streak, Silver, TikTok Lv.4). */
export function sampleConditions(p: Product): Cond[] {
  const pool = p.samples as Pool;
  const posting = MY_SAMPLES.find((s) => s.status === "Posting");
  const postingName = posting ? product(posting.productId).name : "";
  const base: Cond[] = [
    { label: "TikTok Shop linked", ok: CREATOR.tiktokShopLinked, you: "Linked as @aisyah.glow" },
    { label: "Basic profile complete (name, state, WhatsApp)", ok: true, you: "Complete" },
    { label: "No overdue samples", ok: true, you: posting ? `${postingName}: ${posting.videos ? "first video posted. On time." : `first video due ${posting.due}.`}` : "None" },
  ];
  if (pool === "advanced") base.push({ label: "Posting 10 days in a row", ok: true, you: `You're on day ${CREATOR.streak}` });
  if (pool === "designated") base.push({ label: "Posting 30 days in a row", ok: false, you: `You're on day ${CREATOR.streak} (${30 - CREATOR.streak} to go)` });
  return [...base, ...(SELLER_CONDS[p.id] ?? [])];
}
export const canRequest = (p: Product) => !!p.samples && SAMPLE_ACCESS[p.samples as Pool];

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
