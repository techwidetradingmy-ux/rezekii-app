import { LIVE_PRODUCTS, type Product, type Raise } from "./mock";

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
