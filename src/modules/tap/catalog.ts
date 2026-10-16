import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { sampleOffers } from "./samples.ts";
import type { GoldenSeller } from "./golden.ts";
import { MK_SORTS } from "./sorts.ts";

export { MK_SORTS };

/** One TAP Marketplace product as creators see it. Rates are ×100 (600 = 6%). The campaign's total rate stays on the server. */
export type TapProduct = {
  id: string;
  name: string;
  shop: string | null;
  category: string | null;
  image: string | null;
  priceLo: number | null;
  priceHi: number | null;
  openRate: number | null;
  silverRate: number | null;
  sold: number;
  soldToday: number;
  /**
   * 1 when the product really has a free sample through Techwide's TAP campaign: the seller registered samples in the
   * campaign and TikTok's live check confirms one can be requested; 0 when not. TikTok's campaign number until the first check.
   */
  samples: number;
  stock: number | null;
  campaigns: number;
  campaignName: string | null;
  campaignEnd: number | null;
  variants: [string, number, number][];
  asOf: string;
};

export const PAGE_SIZE = 24;

const COLUMNS = "product_id,name,shop,category,image,price_lo,price_hi,open_rate,silver_rate,sold,sold_today,samples,stock,campaign_count,campaign_name,campaign_end,variants,as_of";
type Row = {
  product_id: string; name: string; shop: string | null; category: string | null; image: string | null; price_lo: number | null; price_hi: number | null;
  open_rate: number | null; silver_rate: number | null; sold: number; sold_today: number; samples: number; stock: number | null; campaign_count: number;
  campaign_name: string | null; campaign_end: number | null; variants: [string, number, number][]; as_of: string;
};

const toProduct = (r: Row): TapProduct => ({
  id: r.product_id, name: r.name, shop: r.shop, category: r.category, image: r.image, priceLo: r.price_lo === null ? null : Number(r.price_lo),
  priceHi: r.price_hi === null ? null : Number(r.price_hi), openRate: r.open_rate, silverRate: r.silver_rate, sold: Number(r.sold), soldToday: Number(r.sold_today),
  samples: r.samples, stock: r.stock === null ? null : Number(r.stock), campaigns: r.campaign_count, campaignName: r.campaign_name, campaignEnd: r.campaign_end === null ? null : Number(r.campaign_end),
  variants: r.variants ?? [], asOf: r.as_of,
});

/**
 * Free samples as creators can really get them through Techwide's TAP campaign (owner, 16 Oct 2026): the seller registered
 * samples in the campaign (TikTok's campaign sample number above 0) and TikTok's live check confirms one can be requested.
 * A product with campaign samples that hasn't been checked yet keeps TikTok's campaign number.
 */
export function withSampleOffers(rows: TapProduct[], offers: Record<string, number>): TapProduct[] {
  return rows.map((p) => (p.samples <= 0 ? { ...p, samples: 0 } : p.id in offers ? { ...p, samples: offers[p.id] ? 1 : 0 } : p));
}

/** Free samples as one creator can request them, from their own TikTok check (2 = they can request it). */
export function withCreatorOffers(rows: TapProduct[], offers: Record<string, number>): TapProduct[] {
  return rows.map((p) => ({ ...p, samples: offers[p.id] === 2 ? 1 : 0 }));
}

/** Every Marketplace product, best-selling first. Kept in memory for 10 minutes; the catalog changes once a day. */
let cached: { at: number; rows: TapProduct[] } | null = null;
export async function allProducts(): Promise<TapProduct[]> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.rows;
  const rows: TapProduct[] = [];
  // Supabase returns at most 1,000 rows per request.
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`tap_catalog?select=${COLUMNS}&order=sold.desc,product_id.asc&offset=${offset}&limit=1000`)).json()) as Row[];
    rows.push(...page.map(toProduct));
    if (page.length < 1000) break;
  }
  // Free samples only where the campaign has them and TikTok's nightly live check confirms them (owner, 16 Oct 2026).
  const checked = withSampleOffers(rows, await sampleOffers().catch(() => ({})));
  cached = { at: Date.now(), rows: checked };
  return checked;
}

export type BrowseQuery = { q?: string; cat?: string; shop?: string; only?: boolean; sort?: string; page?: number };
export type BrowseResult = {
  items: TapProduct[]; total: number; sort: string; sortLabel: string;
  /** Categories with counts among products matching the search, shop and samples filters ("All" first). */
  cats: [string, number][];
  /** Every shop with its product count. */
  shops: [string, number][];
  all: number; asOf: string | null;
};

const countBy = (rows: TapProduct[], key: "category" | "shop") => {
  const m = new Map<string, number>();
  for (const p of rows) if (p[key]) m.set(p[key]!, (m.get(p[key]!) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** The Marketplace list: same search, filters, counts and sorts as the mockup. Pure. */
export function browse(all: TapProduct[], o: BrowseQuery): BrowseResult {
  const q = (o.q ?? "").trim().toLowerCase();
  const base = all.filter((p) => (!q || `${p.name} ${p.shop ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q)) && (!o.only || p.samples > 0) && (!o.shop || p.shop === o.shop));
  const sort = MK_SORTS.some(([v]) => v === o.sort) ? o.sort! : "sold-d";
  const [field, dir] = sort.split("-");
  const val = (p: TapProduct) => (field === "com" ? (p.silverRate ?? 0) : field === "price" ? (p.priceLo ?? 0) : field === "smp" ? p.samples : p.sold);
  const cat = o.cat && o.cat !== "All" ? o.cat : "";
  const list = base.filter((p) => !cat || p.category === cat).sort((a, b) => (dir === "d" ? val(b) - val(a) : val(a) - val(b)) || b.sold - a.sold);
  const page = Math.max(1, Math.min(500, Math.floor(o.page ?? 1)));
  return {
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: list.length, sort, sortLabel: MK_SORTS.find(([v]) => v === sort)![1],
    cats: [["All", base.length] as [string, number], ...countBy(base, "category")], shops: countBy(all, "shop"), all: all.length, asOf: all[0]?.asOf ?? null,
  };
}

/** The Golden Sellers saved by the last daily refresh, with each shop's 3 product images. Empty until the first refresh with sales data. */
export async function latestGolden(): Promise<(GoldenSeller & { thumbs: (string | null)[] })[]> {
  const [row] = (await (await supabaseRest("market_snapshots?dataset=eq.tap_golden&select=items&order=as_of.desc&limit=1")).json()) as { items: GoldenSeller[] }[];
  if (!row?.items?.length) return [];
  const byId = new Map((await allProducts()).map((p) => [p.id, p.image]));
  return row.items.map((g) => ({ ...g, thumbs: g.ids.map((id) => byId.get(id) ?? null) }));
}

/** TAP products by ID with their listing description (plain text), for Product Lookup. */
export async function tapProductsWithDescription(ids: string[]): Promise<Map<string, TapProduct & { description: string | null }>> {
  const clean = ids.filter((x) => /^\d{6,25}$/.test(x));
  if (!clean.length) return new Map();
  const rows = (await (await supabaseRest(`tap_catalog?product_id=in.(${clean.join(",")})&select=${COLUMNS},description`)).json()) as (Row & { description: string | null })[];
  return new Map(rows.map((r) => [r.product_id, { ...toProduct(r), description: r.description }]));
}

export async function getProduct(id: string): Promise<TapProduct | null> {
  if (!/^\d{6,25}$/.test(id)) return null;
  const res = await supabaseRest(`tap_catalog?product_id=eq.${id}&select=${COLUMNS}&limit=1`);
  const [row] = (await res.json()) as Row[];
  return row ? toProduct(row) : null;
}

/** What a TAP link should pay the creator: Bronze gets the Open Plan rate; Silver and Gold get Open Plan + 1%, never above the campaign's total. */
export function creatorRateFor(level: "bronze" | "silver" | "gold", openRate: number, totalRate: number | null): number {
  const rate = level === "bronze" ? openRate : openRate + 100;
  return totalRate === null ? rate : Math.min(rate, totalRate);
}

/** The campaign a link is made in, and its total rate (server-only). */
export async function linkTarget(id: string): Promise<{ campaignId: string; openRate: number; totalRate: number | null; name: string; image: string | null } | null> {
  if (!/^\d{6,25}$/.test(id)) return null;
  const res = await supabaseRest(`tap_catalog?product_id=eq.${id}&select=campaign_id,open_rate,total_rate,name,image&limit=1`);
  const [row] = (await res.json()) as { campaign_id: string | null; open_rate: number | null; total_rate: number | null; name: string; image: string | null }[];
  return row?.campaign_id ? { campaignId: row.campaign_id, openRate: row.open_rate ?? 0, totalRate: row.total_rate, name: row.name, image: row.image } : null;
}
