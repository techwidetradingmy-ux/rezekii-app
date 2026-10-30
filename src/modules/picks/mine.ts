import { getShowcaseProducts, lookupProducts, selectProducts } from "../../integrations/tiktok-shop/creator.ts";
import { linesBetween } from "../sales/frames.ts";
import { lineEarned, lineGmv, type OrderLine } from "../sales/summary.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
export const kindOf = (t: string | null) => (/LIVE/i.test(t ?? "") ? "live" : /VIDEO/i.test(t ?? "") ? "video" : "other");

export type ShowcaseItem = { id: string; name: string; img: string | null };

/** Her TikTok Shop showcase, up to `pages` × 20 products; `more` when there are more than that. */
export async function showcaseOf(token: string, pages = 10): Promise<{ items: ShowcaseItem[]; more: boolean }> {
  const items: ShowcaseItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < pages; page++) {
    const r = await getShowcaseProducts(token, pageToken).catch(() => null);
    if (!r || r.code !== 0) break;
    for (const p of r.data?.products ?? []) items.push({ id: p.id, name: p.title ?? "Product", img: p.main_images?.[0]?.url ?? null });
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  return { items, more: !!pageToken };
}

/** TikTok's buyer rating for each product (20 per call); products without one are left out. */
export async function ratingsOf(token: string, ids: string[]): Promise<Map<string, { score: number; count: number }>> {
  const out = new Map<string, { score: number; count: number }>();
  for (let i = 0; i < ids.length; i += 20) {
    const r = await selectProducts(token, ids.slice(i, i + 20)).catch(() => null);
    for (const p of r?.data?.products ?? []) {
      const score = Number(p.review?.overall_score);
      if (Number.isFinite(score) && score > 0) out.set(p.id, { score, count: p.review?.count ?? 0 });
    }
  }
  return out;
}

/** TikTok's leaf category and open-plan rate (×100) for each product (20 per call). */
export async function lookupOf(token: string, ids: string[]): Promise<Map<string, { category: string | null; rate: number | null }>> {
  const out = new Map<string, { category: string | null; rate: number | null }>();
  for (let i = 0; i < ids.length; i += 20) {
    const r = await lookupProducts(token, ids.slice(i, i + 20)).catch(() => null);
    for (const p of r?.data?.products ?? []) {
      const category = p.category_chains?.find((x) => x.is_leaf)?.local_name ?? p.category_chains?.at(-1)?.local_name ?? null;
      out.set(p.id, { category, rate: p.commission?.rate ?? null });
    }
  }
  return out;
}

export type ProductSales = { gmv: number; earned: number; video: number; live: number; units: number; daily: number[] };
export type SalesProfile = {
  lines: OrderLine[];
  /** Per product: what she sold, through video or LIVE, and units per Malaysia day for the last 7 days (oldest first). */
  products: Map<string, ProductSales>;
  /** TikTok's category for her best-selling products, and each category's share of her sales (0 to 1). */
  categoryOf: Map<string, string>;
  categories: Map<string, { share: number; video: number; live: number }>;
  video: number; live: number; gmv: number; orders: number;
  /** The price of every item she sold, low to high. */
  units: number[];
};

/** Her own last 30 days of sales, read for picks: categories, video or LIVE, prices and the last 7 days per product. */
export async function salesProfile(userId: string, token: string, days = 30): Promise<SalesProfile> {
  const now = Date.now();
  const lines = await linesBetween(userId, now - days * DAY, now).catch(() => []);
  const today = Math.floor((now + MYT) / DAY);
  const products = new Map<string, ProductSales>();
  const orders = new Set<string>();
  const units: number[] = [];
  let gmv = 0, video = 0, live = 0;
  for (const l of lines) {
    const g = lineGmv(l);
    const e = lineEarned(l);
    if (g <= 0) continue;
    orders.add(l.order_id);
    gmv += g;
    const n = Math.max(0, l.quantity - l.refunded_quantity - l.returned_quantity);
    for (let i = 0; i < Math.min(n, 20); i++) units.push(Number(l.price));
    const k = kindOf(l.content_type);
    if (k === "video") video += e || g;
    if (k === "live") live += e || g;
    if (!l.product_id) continue;
    const m = products.get(l.product_id) ?? products.set(l.product_id, { gmv: 0, earned: 0, video: 0, live: 0, units: 0, daily: [0, 0, 0, 0, 0, 0, 0] }).get(l.product_id)!;
    m.gmv += g;
    m.earned += e;
    m.units += n;
    if (k === "video") m.video += e || g;
    if (k === "live") m.live += e || g;
    const ago = today - Math.floor((Date.parse(l.created_at) + MYT) / DAY);
    if (ago >= 0 && ago < 7) m.daily[6 - ago] += n;
  }
  units.sort((a, b) => a - b);

  const top = [...products.entries()].sort((a, b) => b[1].gmv - a[1].gmv).slice(0, 60);
  const looked = await lookupOf(token, top.map(([id]) => id));
  const categoryOf = new Map<string, string>();
  const cats = new Map<string, { gmv: number; video: number; live: number }>();
  for (const [id, m] of top) {
    const c = looked.get(id)?.category;
    if (!c) continue;
    categoryOf.set(id, c);
    const s = cats.get(c) ?? cats.set(c, { gmv: 0, video: 0, live: 0 }).get(c)!;
    s.gmv += m.gmv;
    s.video += m.video;
    s.live += m.live;
  }
  const catGmv = [...cats.values()].reduce((s, c) => s + c.gmv, 0);
  const categories = new Map([...cats.entries()].map(([c, s]) => [c, { share: catGmv ? s.gmv / catGmv : 0, video: s.video, live: s.live }]));
  return { lines, products, categoryOf, categories, video, live, gmv, orders: orders.size, units };
}
