import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getShopProduct, searchOpenCollaborations, searchShopProducts, shopProductSales, type ProductStatus, type ShopProduct } from "../../integrations/tiktok-shop/seller.ts";
import { sellerAccessFor } from "./seller-connection.ts";
import { shopCampaignState, type Registered } from "./shop-campaign.ts";

/** A TAP request's status, as tap_submissions stores it. */
/** approved = Techwide's review passed, waiting to be sent to TikTok (the seller still sees "Our review"). */
export type RequestStatus = "submitted" | "in_review" | "approved" | "with_tiktok" | "live" | "not_approved" | "withdrawn";

/** One of the seller's products for Shop Products and Submit Products. Rates ×100 (500 = 5%). */
export type LiveShopProduct = {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  category: string;
  sub: string;
  /** TikTok's most specific category for it (as the TAP catalog names categories). */
  leaf: string;
  /** ACTIVATE = buyers can see it; PENDING = TikTok is reviewing the listing. */
  listing: "ACTIVATE" | "PENDING";
  /** Units sold in the last 90 days (TikTok Shop Analytics), null when TikTok didn't send it. */
  sold90: number | null;
  /** The shop's own public (open plan) commission for it, ×100; null when it has none or TikTok didn't send it. */
  openRate: number | null;
  /** In one of Techwide's TAP campaigns (approved), from tap_catalog. */
  tap: { openRate: number | null; totalRate: number | null; sold: number | null } | null;
  /** Registered in the shop's own Techwide campaign in Seller Center (owner, 31 Oct 2026), from TikTok. */
  registered: { status: Registered["status"]; totalRate: number | null; campaignId: string } | null;
  /** The latest request to join Techwide's TAP made on Rezekii (before 31 Oct 2026 sellers asked here first). */
  request: { status: RequestStatus; raise: number; samples: number; reason: string | null; at: string; campaignId: string | null; totalRate: number | null; steps: { at: string; stage?: RequestStatus }[] } | null;
};

export type ShopProducts = { shop: string; items: LiveShopProduct[]; notLive: number; at: string; campaignId: string | null };

type Detail = { image: string | null; category: string; sub: string; leaf: string };
// Photos and categories only change when the product does, so they are kept per product version.
const details = new Map<string, Detail>();

async function detailFor(token: string, cipher: string, p: ShopProduct): Promise<Detail> {
  const key = `${p.id}:${p.update_time ?? 0}`;
  const kept = details.get(key);
  if (kept) return kept;
  const r = await getShopProduct(token, cipher, p.id);
  const chain = r.data?.category_chains ?? [];
  const img = r.data?.main_images?.[0];
  const d: Detail = { image: img?.thumb_urls?.[0] ?? img?.urls?.[0] ?? null, category: chain[0]?.local_name ?? "", sub: chain[1]?.local_name ?? "", leaf: chain.find((c) => c.is_leaf)?.local_name ?? chain.at(-1)?.local_name ?? "" };
  if (r.code === 0) details.set(key, d);
  return d;
}

/** Runs `fn` over `items`, at most `n` at a time. */
async function inBatches<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  return out;
}

/** Shop days (YYYY-MM-DD, Malaysia) for the last `days` days, ending today (TikTok's end is exclusive). */
const lastDays = (days: number) => {
  const day = (t: number) => new Date(t + 8 * 3_600_000).toISOString().slice(0, 10);
  return { start: day(Date.now() - days * 86_400_000), end: day(Date.now()) };
};

/** Units sold per product in the last 90 days; empty when TikTok refuses (e.g. Analytics not authorized). */
async function salesByProduct(token: string, cipher: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const range = lastDays(90);
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const r = await shopProductSales(token, cipher, { ...range, pageToken });
    if (r.code !== 0) break;
    for (const p of r.data?.products ?? []) out.set(p.id, Number(p.overall_performance?.items_sold ?? 0));
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  return out;
}

/** The shop's public commission per product (×100); empty when TikTok refuses. */
export async function openRates(token: string, cipher: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const r = await searchOpenCollaborations(token, cipher, { pageToken });
    if (r.code !== 0) break;
    for (const o of r.data?.open_collaborations ?? []) if (o.product?.id && o.current_commission?.rate != null) out.set(o.product.id, o.current_commission.rate);
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
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
  type ReqRow = { product_id: string; status: RequestStatus; raise_pct: number; samples_per_sku: number; reason: string | null; created_at: string; campaign_id: string | null; total_rate: number | null; history: { at: string; stage?: RequestStatus }[] };
  const tapRows: TapRow[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    tapRows.push(...((await (await supabaseRest(`tap_catalog?product_id=in.(${ids.slice(i, i + 150).join(",")})&select=product_id,open_rate,total_rate,sold`)).json()) as TapRow[]));
  }
  const [info, reqRows, sales, rates, camp] = await Promise.all([
    inBatches(products, 8, (p) => detailFor(token, shop.cipher, p)),
    supabaseRest(`tap_submissions?shop_id=eq.${shop.id}&status=neq.withdrawn&select=product_id,status,raise_pct,samples_per_sku,reason,created_at,campaign_id,total_rate,history&order=created_at.desc`).then((r) => r.json() as Promise<ReqRow[]>),
    salesByProduct(token, shop.cipher).catch(() => new Map<string, number>()),
    openRates(token, shop.cipher).catch(() => new Map<string, number>()),
    shopCampaignState(shop).catch(() => null),
  ]);
  const own = camp?.ok ? camp : null;
  const reg = new Map((own?.products ?? []).map((r) => [r.id, r]));
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
      leaf: info[i].leaf,
      listing: p.status === "PENDING" ? "PENDING" : "ACTIVATE",
      sold90: sales.size ? sales.get(p.id) ?? 0 : null,
      openRate: rates.get(p.id) ?? null,
      tap: t ? { openRate: t.open_rate, totalRate: t.total_rate, sold: t.sold } : null,
      registered: reg.has(p.id) ? { status: reg.get(p.id)!.status, totalRate: reg.get(p.id)!.totalRate, campaignId: own!.campaign.id } : null,
      request: q ? { status: q.status, raise: Number(q.raise_pct), samples: q.samples_per_sku, reason: q.reason, at: q.created_at, campaignId: q.campaign_id, totalRate: q.total_rate, steps: (q.history ?? []).map((h) => ({ at: h.at, stage: h.stage })) } : null,
    };
  });
  return { shop: shop.name, campaignId: own?.campaign.id ?? null, items, notLive: Math.max(0, (all.data?.total_count ?? products.length) - products.length), at: new Date().toISOString() };
}
