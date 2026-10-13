import { supabaseRest } from "../../integrations/supabase/rest.ts";

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
  samples: number;
  stock: number | null;
  campaigns: number;
  campaignName: string | null;
  campaignEnd: number | null;
  variants: [string, number, number][];
  asOf: string;
};

export const SORTS = { sold: "sold.desc", today: "sold_today.desc,sold.desc", rate: "silver_rate.desc,sold.desc", "price-asc": "price_lo.asc", "price-desc": "price_lo.desc" } as const;
export type Sort = keyof typeof SORTS;
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

/** Search text is used inside a PostgREST filter, so only letters, digits and spaces are kept. */
export const cleanQuery = (q: string) => q.normalize("NFKC").replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export type ProductQuery = { q?: string; category?: string; shop?: string; samples?: boolean; sort?: Sort; page?: number };

/** One page of products plus the total that match. */
export async function searchProducts(o: ProductQuery): Promise<{ products: TapProduct[]; total: number }> {
  const params = new URLSearchParams({ select: COLUMNS, order: SORTS[o.sort ?? "sold"] });
  const q = cleanQuery(o.q ?? "");
  if (q) {
    const like = `*${q.replace(/ /g, "*")}*`;
    params.set("or", `(name.ilike.${like},shop.ilike.${like},category.ilike.${like})`);
  }
  if (o.category) params.set("category", `eq.${o.category}`);
  if (o.shop) params.set("shop", `eq.${o.shop}`);
  if (o.samples) params.set("samples", "gt.0");
  const page = Math.max(1, Math.min(200, Math.floor(o.page ?? 1)));
  params.set("offset", String((page - 1) * PAGE_SIZE));
  params.set("limit", String(PAGE_SIZE));
  const res = await supabaseRest(`tap_catalog?${params}`, { headers: { prefer: "count=exact" } });
  const total = Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
  return { products: ((await res.json()) as Row[]).map(toProduct), total };
}

export async function getProduct(id: string): Promise<TapProduct | null> {
  if (!/^\d{6,25}$/.test(id)) return null;
  const res = await supabaseRest(`tap_catalog?product_id=eq.${id}&select=${COLUMNS}&limit=1`);
  const [row] = (await res.json()) as Row[];
  return row ? toProduct(row) : null;
}

/** Categories and shops with product counts, for the filters. */
export async function facets(): Promise<{ categories: [string, number][]; shops: [string, number][]; total: number; withSamples: number; asOf: string | null }> {
  const res = await supabaseRest("tap_catalog?select=category,shop,samples,as_of&limit=10000");
  const rows = (await res.json()) as { category: string | null; shop: string | null; samples: number; as_of: string }[];
  const count = (key: "category" | "shop") => {
    const m = new Map<string, number>();
    for (const r of rows) if (r[key]) m.set(r[key]!, (m.get(r[key]!) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  return { categories: count("category"), shops: count("shop"), total: rows.length, withSamples: rows.filter((r) => r.samples > 0).length, asOf: rows[0]?.as_of ?? null };
}

/** What a TAP link should pay the creator: Bronze gets the Open Plan rate; Silver and Gold get Open Plan + 1%, never above the campaign's total. */
export function creatorRateFor(level: "bronze" | "silver" | "gold", openRate: number, totalRate: number | null): number {
  const rate = level === "bronze" ? openRate : openRate + 100;
  return totalRate === null ? rate : Math.min(rate, totalRate);
}

/** The campaign a link is made in, and its total rate (server-only). */
export async function linkTarget(id: string): Promise<{ campaignId: string; openRate: number; totalRate: number | null } | null> {
  if (!/^\d{6,25}$/.test(id)) return null;
  const res = await supabaseRest(`tap_catalog?product_id=eq.${id}&select=campaign_id,open_rate,total_rate&limit=1`);
  const [row] = (await res.json()) as { campaign_id: string | null; open_rate: number | null; total_rate: number | null }[];
  return row?.campaign_id ? { campaignId: row.campaign_id, openRate: row.open_rate ?? 0, totalRate: row.total_rate } : null;
}
