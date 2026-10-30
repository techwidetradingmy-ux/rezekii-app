import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getShopProduct, searchShopProducts, type ProductStatus, type ShopProduct } from "../../integrations/tiktok-shop/seller.ts";
import { sellerAccessFor } from "./seller-connection.ts";

/** A TAP request's status, as tap_submissions stores it. */
export type RequestStatus = "submitted" | "in_review" | "with_tiktok" | "live" | "not_approved" | "withdrawn";

/** One of the seller's products for Shop Products and Submit Products. Rates ×100 (500 = 5%). */
export type LiveShopProduct = {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  category: string;
  sub: string;
  /** ACTIVATE = buyers can see it; PENDING = TikTok is reviewing the listing. */
  listing: "ACTIVATE" | "PENDING";
  /** In one of Techwide's TAP campaigns (approved), from tap_catalog. */
  tap: { openRate: number | null; totalRate: number | null; sold: number | null } | null;
  /** The latest request to join Techwide's TAP made on Rezekii. */
  request: { status: RequestStatus; raise: number; samples: number; reason: string | null; at: string } | null;
};

export type ShopProducts = { shop: string; items: LiveShopProduct[]; notLive: number; at: string };

type Detail = { image: string | null; category: string; sub: string };
// Photos and categories only change when the product does, so they are kept per product version.
const details = new Map<string, Detail>();

async function detailFor(token: string, cipher: string, p: ShopProduct): Promise<Detail> {
  const key = `${p.id}:${p.update_time ?? 0}`;
  const kept = details.get(key);
  if (kept) return kept;
  const r = await getShopProduct(token, cipher, p.id);
  const chain = r.data?.category_chains ?? [];
  const img = r.data?.main_images?.[0];
  const d: Detail = { image: img?.thumb_urls?.[0] ?? img?.urls?.[0] ?? null, category: chain[0]?.local_name ?? "", sub: chain[1]?.local_name ?? "" };
  if (r.code === 0) details.set(key, d);
  return d;
}

/** Runs `fn` over `items`, at most `n` at a time. */
async function inBatches<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  return out;
}

const lowestPrice = (p: ShopProduct) => {
  const prices = (p.skus ?? []).map((s) => Number(s.price?.sale_price ?? s.price?.tax_exclusive_price)).filter((v) => Number.isFinite(v) && v > 0);
  return prices.length ? Math.min(...prices) : null;
};

/**
 * The seller's products that are live or in TikTok's review, with their place in Techwide's TAP (owner, 30 Oct 2026: Shop
 * Products and Submit Products on real data). Null when this person has no shop authorized. Up to 1,000 of each.
 */
export async function shopProducts(user: { id: string; role: string }): Promise<ShopProducts | null> {
  const access = await sellerAccessFor(user);
  if (!access) return null;
  const { shop, token } = access;

  const list = async (status: ProductStatus) => {
    const out: ShopProduct[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const r = await searchShopProducts(token, shop.cipher, { status, pageToken });
      if (r.code !== 0) throw new Error(`Search Products failed: ${r.code} ${r.message}`);
      out.push(...(r.data?.products ?? []));
      pageToken = r.data?.next_page_token || undefined;
      if (!pageToken) break;
    }
    return out;
  };
  const [live, pending, all] = await Promise.all([list("ACTIVATE"), list("PENDING"), searchShopProducts(token, shop.cipher, { pageSize: 1 })]);
  const products = [...live, ...pending];
  const ids = products.map((p) => p.id);

  type TapRow = { product_id: string; open_rate: number | null; total_rate: number | null; sold: number | null };
  type ReqRow = { product_id: string; status: RequestStatus; raise_pct: number; samples_per_sku: number; reason: string | null; created_at: string };
  const tapRows: TapRow[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    tapRows.push(...((await (await supabaseRest(`tap_catalog?product_id=in.(${ids.slice(i, i + 150).join(",")})&select=product_id,open_rate,total_rate,sold`)).json()) as TapRow[]));
  }
  const [info, reqRows] = await Promise.all([
    inBatches(products, 8, (p) => detailFor(token, shop.cipher, p)),
    supabaseRest(`tap_submissions?shop_id=eq.${shop.id}&status=neq.withdrawn&select=product_id,status,raise_pct,samples_per_sku,reason,created_at&order=created_at.desc`).then((r) => r.json() as Promise<ReqRow[]>),
  ]);
  const tap = new Map(tapRows.map((t) => [t.product_id, t]));
  const latest = new Map<string, ReqRow>();
  for (const q of reqRows) if (!latest.has(q.product_id)) latest.set(q.product_id, q);

  const items = products.map((p, i): LiveShopProduct => {
    const t = tap.get(p.id);
    const q = latest.get(p.id);
    return {
      id: p.id,
      name: p.title,
      image: info[i].image,
      price: lowestPrice(p),
      category: info[i].category,
      sub: info[i].sub,
      listing: p.status === "PENDING" ? "PENDING" : "ACTIVATE",
      tap: t ? { openRate: t.open_rate, totalRate: t.total_rate, sold: t.sold } : null,
      request: q ? { status: q.status, raise: Number(q.raise_pct), samples: q.samples_per_sku, reason: q.reason, at: q.created_at } : null,
    };
  });
  return { shop: shop.name, items, notLive: Math.max(0, (all.data?.total_count ?? products.length) - products.length), at: new Date().toISOString() };
}
