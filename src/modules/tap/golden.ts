/** Golden Sellers: the 3 shops with the most sales (GMV) through Techwide's TAP campaigns. Pure: no network, no database. */

/** One campaign product's sales: [productId, shop name ("" if unknown), estimated GMV in RM]. */
export type StatRow = [string, string, number];
export type GoldenSeller = { shop: string; initial: string; count: number; sold: number; ids: string[] };

/** TikTok sends amounts as strings, sometimes with thousands separators ("30,537.03"). */
export const amount = (v: unknown) => Number(String(v ?? "0").replace(/[^0-9.]/g, "")) || 0;

/**
 * Ranks shops by GMV across every campaign, then keeps the top 3 that still have products in the Marketplace.
 * Each shows its live product count, their units sold, and its 3 best-selling products.
 */
export function goldenSellers(stats: StatRow[], live: { id: string; shop: string | null; sold: number }[]): GoldenSeller[] {
  const gmv = new Map<string, number>();
  for (const [, shop, v] of stats) if (shop) gmv.set(shop, (gmv.get(shop) ?? 0) + v);
  const byShop = new Map<string, { id: string; sold: number }[]>();
  for (const p of live) if (p.shop) byShop.set(p.shop, [...(byShop.get(p.shop) ?? []), p]);
  const out: GoldenSeller[] = [];
  for (const [shop] of [...gmv.entries()].sort((a, b) => b[1] - a[1])) {
    const rows = byShop.get(shop);
    if (!rows) continue;
    rows.sort((a, b) => b.sold - a.sold);
    out.push({ shop, initial: shop.trim()[0]?.toUpperCase() ?? "?", count: rows.length, sold: rows.reduce((s, r) => s + r.sold, 0), ids: rows.slice(0, 3).map((r) => r.id) });
    if (out.length === 3) break;
  }
  return out;
}
