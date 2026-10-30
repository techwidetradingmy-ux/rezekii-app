import { listCampaignProductStats, listCampaignProducts } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { amount } from "../tap/golden.ts";

export type Merchant = { shop: string; products: number; selling: number; gmv: number; orders: number; creators: number; samples: number; top: { name: string; gmv: number; orders: number }[] };
const cache = new Map<string, { at: number; data: { merchants: Merchant[]; asOf: string | null } }>();

/**
 * Every merchant in one Techwide campaign with what their products did (owner, 31 Oct 2026: real data from TikTok's partner
 * reports, lifetime totals): sales, orders, creators promoting and samples asked. For a BD call. Kept 30 minutes.
 */
export async function merchantPerformance(campaignId: string) {
  const hit = cache.get(campaignId);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.data;
  const s = await storedSessions().partner();
  const shopOf = new Map<string, string>();
  let pageToken: string | undefined;
  for (let page = 0; page < 30; page++) {
    const r = await listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "APPROVED", pageSize: 50, pageToken });
    if (r.code !== 0) break;
    for (const p of r.data?.products ?? []) shopOf.set(p.id, p.shop_name ?? "Unknown shop");
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  const by = new Map<string, Merchant>();
  let asOf: string | null = null;
  pageToken = undefined;
  for (let page = 0; page < 30; page++) {
    const r = await listCampaignProductStats(s.token, s.cipher, campaignId, { pageSize: 50, pageToken });
    if (r.code !== 0) break;
    for (const x of r.data?.campaign_product_statistics ?? []) {
      const d = x.campaign_product_detail;
      if (!d?.product_id) continue;
      const shop = shopOf.get(d.product_id) ?? "Unknown shop";
      const m = by.get(shop) ?? by.set(shop, { shop, products: 0, selling: 0, gmv: 0, orders: 0, creators: 0, samples: 0, top: [] }).get(shop)!;
      const gmv = amount(d.indicator_data?.estimated_amount) || amount(d.indicator_data?.actual_amount);
      const orders = Number(d.indicator_data?.paid_order_num ?? 0) || 0;
      m.products += 1;
      if (orders > 0) m.selling += 1;
      m.gmv += gmv;
      m.orders += orders;
      m.creators += x.promoted_creator_num ?? 0;
      m.samples += x.sample_requested_creator_num ?? 0;
      m.top.push({ name: d.product_name ?? "Product", gmv, orders });
      const sec = Number(x.data_update_time);
      if (sec > 0) { const at = new Date(sec > 1e12 ? sec : sec * 1000).toISOString(); if (!asOf || at > asOf) asOf = at; }
    }
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  const merchants = [...by.values()]
    .map((m) => ({ ...m, gmv: Math.round(m.gmv * 100) / 100, top: m.top.sort((a, b) => b.gmv - a.gmv).slice(0, 5) }))
    .sort((a, b) => b.gmv - a.gmv || b.orders - a.orders);
  const data = { merchants, asOf };
  cache.set(campaignId, { at: Date.now(), data });
  return data;
}
