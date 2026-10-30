import { LIVE_PRODUCTS, short, type Product, type Raise } from "./mock";
import type { ShopItem, Stage } from "./mock-seller";
import type { LiveShopProduct } from "@/modules/marketplace/shop-products.ts";

/**
 * Real data for the screens (owner, 30 Oct 2026: plug real data, keep the design). The server's answers are turned into the
 * same shapes the sample data uses, and real products are remembered so product() and the product page find them too.
 * Rates arrive ×100 (500 = 5%).
 */

/** A showcase product that pays more through Techwide's TAP campaign, as /api/tap/raises sends it. */
export type LiveRaise = { productId: string; name: string; shop: string; image: string | null; price: number | null; nowRate: number; tapRate: number };

export function fromLiveRaise(r: LiveRaise): Raise {
  const now = r.nowRate / 100;
  const tap = r.tapRate / 100;
  LIVE_PRODUCTS.set(r.productId, {
    id: r.productId, name: r.name, shop: r.shop, img: r.image ?? "/avatars/blank.svg", price: r.price ?? 0, category: "",
    publicRate: now, partnerRate: tap, tapRate: tap, sold: 0, rating: 0, samples: null,
  });
  return { id: r.productId, productId: r.productId, nowRate: now, tapRate: tap, until: "", eligible: true };
}

/** Her real scan: better rates in her showcase, and how many showcase products were checked. */
export async function loadScan(): Promise<{ raises: Raise[]; checked: number } | null> {
  const [raises, count] = await Promise.all([
    fetch("/api/tap/raises", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    fetch("/api/tap/showcase?count=1", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
  ]);
  if (!raises) return null;
  return { raises: ((raises.raises ?? []) as LiveRaise[]).map(fromLiveRaise), checked: Number(count?.count ?? 0) };
}

/** Adds products to her showcase through Techwide's TAP campaign, for real. */
export async function addRaises(productIds: string[]): Promise<{ added: string[]; failed: { productId: string; error: string }[]; raises: Raise[] }> {
  const r = await fetch("/api/tap/raises", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productIds }) });
  const d = await r.json().catch(() => ({}));
  return { added: d.added ?? [], failed: d.failed ?? [], raises: ((d.raises ?? []) as LiveRaise[]).map(fromLiveRaise) };
}

/** A Marketplace product, as /api/tap/products sends it. openRate = the open plan (Bronze); silverRate = Silver and Gold. */
export type LiveTap = { id: string; name: string; shop: string | null; category: string | null; image: string | null; priceLo: number | null; openRate: number | null; silverRate: number | null; sold: number; samples: number };

export function fromLiveTap(t: LiveTap, level: "bronze" | "silver" | "gold"): Product {
  const open = (t.openRate ?? 0) / 100;
  const silver = (t.silverRate ?? t.openRate ?? 0) / 100;
  const p: Product = {
    id: t.id, name: t.name, shop: t.shop ?? "", img: t.image ?? "/avatars/blank.svg", price: t.priceLo ?? 0, category: t.category ?? "Other",
    publicRate: open, partnerRate: silver, tapRate: level === "bronze" ? open : silver, sold: t.sold, rating: 0, samples: t.samples > 0 ? 0 : null,
  };
  LIVE_PRODUCTS.set(t.id, p);
  return p;
}

const SORT_KEYS: Record<string, string> = { sold: "sold-d", rate: "com-d", earn: "com-d", cheap: "price-a", dear: "price-d", samples: "smp-d" };

/** One page of the real Marketplace with its category counts. */
export async function loadMarket(o: { q: string; cat: string; sort: string; onlySamples: boolean; page: number }, level: "bronze" | "silver" | "gold") {
  const qs = new URLSearchParams({ q: o.q, sort: SORT_KEYS[o.sort] ?? "sold-d", page: String(o.page) });
  if (o.cat !== "All") qs.set("cat", o.cat);
  if (o.onlySamples) qs.set("only", "1");
  const d = await fetch(`/api/tap/products?${qs}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
  if (!d) return null;
  return {
    items: ((d.items ?? []) as LiveTap[]).map((t) => fromLiveTap(t, level)),
    total: Number(d.total ?? 0),
    cats: ((d.cats ?? []) as [string, number][]).filter(([c]) => c !== "All"),
    all: Number(d.all ?? 0),
  };
}

/** + Showcase for one real product: added straight away, or a TAP link to open. */
export async function addOne(productId: string): Promise<{ added: boolean; link?: string; error?: string }> {
  const r = await fetch("/api/tap/showcase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
  return r.json().catch(() => ({ added: false, error: "Couldn't reach TikTok Shop." }));
}

/** Her Analytics and Payouts from her real orders, as /api/v2/analytics sends them (same shapes as the sample). */
export type LiveAnalytics = {
  ranges: Record<string, import("./mock-creator2").RangeData>;
  charts: Record<string, import("./mock-creator2").Chart>;
  months: { month: string; est: number; paid: number; pending: number; clawed: number; extra: number; status: "Settling" | "Paid"; year: number; monthIndex: number; days: import("./mock-creator2").PayoutDay[] }[];
  products: Record<string, { name: string; shop: string }>;
  lines: number;
};

let analytics: Promise<LiveAnalytics | null> | null = null;
export function loadAnalytics(): Promise<LiveAnalytics | null> {
  analytics ??= fetch("/api/v2/analytics", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<LiveAnalytics>) : null))
    .then((d) => {
      if (!d) return null;
      for (const [id, x] of Object.entries(d.products))
        if (!LIVE_PRODUCTS.has(id)) LIVE_PRODUCTS.set(id, { id, name: x.name, shop: x.shop, img: "/avatars/blank.svg", price: 0, category: "", publicRate: 0, partnerRate: 0, tapRate: 0, sold: 0, rating: 0, samples: null });
      return d;
    })
    .catch(() => null);
  return analytics;
}

/** One real Marketplace product by id (a page opened straight from a link, before the list has loaded). */
export async function loadProduct(id: string, level: "bronze" | "silver" | "gold"): Promise<Product | null> {
  if (LIVE_PRODUCTS.has(id)) return LIVE_PRODUCTS.get(id) ?? null;
  const d = await fetch(`/api/tap/products/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return d?.product ? fromLiveTap(d.product as LiveTap, level) : null;
}

/** Free sample through Techwide's TAP campaign: TikTok's one-time link to its sample request page. */
export async function requestSample(productId: string): Promise<{ deeplink?: string; phoneUrl?: string; error?: string }> {
  const r = await fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
  return r.json().catch(() => ({ error: "Couldn't reach TikTok Shop." }));
}

const STAGE: Record<string, Stage> = { submitted: "Submitted", in_review: "Under review", approved: "Under review", with_tiktok: "Submitted to TikTok", live: "Live", not_approved: "Not approved" };
/** "30 Oct", Malaysia time. */
export const myDay = (t: string | number | Date = Date.now()) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });

/** Techwide's campaign for the shop in Seller Center, where the seller registers the product (Affiliate → Partner collaborations). */
export const sellerCenterCampaign = (campaignId: string) =>
  `https://seller-my.tiktok.com/affiliate/partner/partner-collabs/agency/detail?campaign_id=${encodeURIComponent(campaignId)}&tab=overview&shop_region=MY`;

/**
 * Rezekii's AI pick from a product's real units sold in the last 90 days (our reading of TikTok's numbers, not TikTok's): no
 * sales needs the most, a few sales a little more, a seller already selling well the least.
 */
export function salesPick(sold90: number): { label: string; raise: number; why: string } {
  if (sold90 === 0) return { label: "No sales in 90 days", raise: 10, why: "it had no sales in the last 90 days, so creators need a bigger reason to try it" };
  if (sold90 < 300) return { label: `${short(sold90)} sold in 90 days`, raise: 8, why: `it sold ${short(sold90)} in the last 90 days, and a little more helps it take off` };
  return { label: `${short(sold90)} sold in 90 days`, raise: 5, why: `it already sold ${short(sold90)} in the last 90 days, so creators say yes easily` };
}

/** A real shop product in the sample data's shape. Live in TAP comes from Techwide's campaigns; the rest from requests made here. */
export function fromLiveShop(p: LiveShopProduct): ShopItem {
  const stage: Stage = p.tap ? "Live" : (p.request && STAGE[p.request.status]) || "Not submitted";
  // The day each step was reached, from the request's history.
  const reached = (s: string) => p.request?.steps.find((x) => x.stage === s)?.at;
  const dates: ShopItem["dates"] = p.request ? { Submitted: myDay(p.request.at) } : undefined;
  if (dates) {
    const review = reached("in_review"), sent = reached("with_tiktok"), live = reached("live");
    if (review) dates["Under review"] = myDay(review);
    if (sent) dates["Submitted to TikTok"] = myDay(sent);
    if (live) dates.Live = myDay(live);
  }
  const total = p.tap?.totalRate ?? p.request?.totalRate ?? null;
  // The shop's own open plan rate first (current), else the one TikTok shows in Techwide's campaign.
  const publicRate = p.openRate != null ? p.openRate / 100 : p.tap?.openRate != null ? p.tap.openRate / 100 : null;
  return {
    id: p.id, name: p.name, img: p.image ?? "/avatars/blank.svg", price: p.price ?? 0, category: p.category || "Other", sub: p.sub,
    publicRate,
    sold: p.sold90 ?? 0, salesUnknown: p.sold90 == null,
    soldLabel: p.sold90 == null ? undefined : p.sold90 ? `${short(p.sold90)} sold in 90 days` : "No sales in 90 days",
    ai: p.sold90 == null ? undefined : salesPick(p.sold90),
    // TikTok's total rate once live; before that, what the seller asked for (public + their extra), when the public rate is known.
    stage, tapRate: total != null ? total / 100 : p.request && stage !== "Not approved" && publicRate != null ? publicRate + p.request.raise : undefined, raise: p.request?.raise,
    register: stage === "Submitted to TikTok" && p.request?.campaignId ? sellerCenterCampaign(p.request.campaignId) : undefined,
    samples: p.request?.samples,
    reason: p.request?.status === "not_approved" ? p.request.reason ?? undefined : undefined,
    dates,
    note: p.listing === "PENDING" ? "TikTok is reviewing this listing" : undefined,
    real: true, listing: p.listing,
  };
}

type LiveShop = { shop: string; items: ShopItem[]; notLive: number; at: string };
let shopCache: { at: number; data: LiveShop | null } | null = null;

/** The seller's real products, or null when no Seller Center shop is authorized for this account. Kept 1 minute unless `fresh`. */
export async function loadShop(fresh = false): Promise<LiveShop | null> {
  if (!fresh && shopCache && Date.now() - shopCache.at < 60_000) return shopCache.data;
  const data = await fetchShop();
  shopCache = { at: Date.now(), data };
  return data;
}

async function fetchShop(): Promise<LiveShop | null> {
  const r = await fetch("/api/v2/seller/products");
  const d = await r.json().catch(() => ({ error: "Couldn't reach TikTok Shop. Please try again." }));
  if (!r.ok) throw new Error(d.error ?? "Couldn't reach TikTok Shop. Please try again.");
  if (!d.linked) return null;
  return { shop: d.shop, items: (d.items as LiveShopProduct[]).map(fromLiveShop), notLive: d.notLive, at: d.at };
}

/** Submit products to Techwide's TAP; each waits for Techwide's review. */
export async function submitToTap(body: { productIds: string[]; raise: number; samples: number; conditions: Record<string, unknown> }): Promise<{ submitted?: { id: string }[]; skipped?: { id: string; why: string }[]; error?: string; campaignId?: string; handOff?: string }> {
  shopCache = null;
  const r = await fetch("/api/v2/seller/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ error: "Couldn't reach Rezekii. Please try again." }));
}
