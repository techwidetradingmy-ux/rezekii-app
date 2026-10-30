import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listCampaignProductStats, listProductCreators } from "../../integrations/tiktok-shop/partner.ts";
import { sellerAccessFor } from "../marketplace/seller-connection.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { amount } from "../tap/golden.ts";

export type ProductResult = { id: string; name: string; img: string | null; gmv: number; orders: number; creators: number; selling: number; samples: number; videos: number; lives: number };
export type CreatorResult = { handle: string; name: string; avatar: string | null; followers: number; gmv: number; videos: number; lives: number };
export type TapResults = {
  linked: boolean;
  totals: { gmv: number; orders: number; creators: number; videos: number; lives: number; live: number };
  products: ProductResult[];
  creators: CreatorResult[];
  /** When TikTok last updated the numbers. */
  asOf: string | null;
};

type Sub = { product_id: string; product_name: string | null; product_image: string | null; campaign_id: string };

/**
 * Her products in Techwide's TAP campaigns (owner, 31 Oct 2026: real data), from TikTok's partner reports. TikTok gives
 * lifetime totals only (no date ranges since its order search was retired), so these are since each product went live.
 */
export async function tapResults(user: { id: string; role: string }): Promise<TapResults | null> {
  const access = await sellerAccessFor(user);
  if (!access) return null;
  const subs = (await (await supabaseRest(`tap_submissions?shop_id=eq.${access.shop.id}&status=eq.live&campaign_id=not.is.null&select=product_id,product_name,product_image,campaign_id`)).json()) as Sub[];
  const empty: TapResults = { linked: true, totals: { gmv: 0, orders: 0, creators: 0, videos: 0, lives: 0, live: 0 }, products: [], creators: [], asOf: null };
  if (!subs.length) return empty;

  const s = await storedSessions().partner();
  const mine = new Map(subs.map((x) => [x.product_id, x]));
  const products = new Map<string, ProductResult>();
  let asOf: string | null = null;
  for (const campaignId of [...new Set(subs.map((x) => x.campaign_id))]) {
    let pageToken: string | undefined;
    for (let page = 0; page < 20; page++) {
      const r = await listCampaignProductStats(s.token, s.cipher, campaignId, { pageSize: 50, pageToken });
      if (r.code !== 0) break;
      for (const x of r.data?.campaign_product_statistics ?? []) {
        const d = x.campaign_product_detail;
        const sub = d?.product_id ? mine.get(d.product_id) : undefined;
        if (!d || !sub) continue;
        const k = d.indicator_data;
        products.set(d.product_id, {
          id: d.product_id, name: d.product_name ?? sub.product_name ?? "Product", img: sub.product_image, gmv: amount(k?.estimated_amount) || amount(k?.actual_amount),
          orders: Number(k?.paid_order_num ?? k?.actual_order_num ?? 0) || 0, creators: x.promoted_creator_num ?? 0, selling: x.creator_sales_num ?? 0,
          samples: x.sample_requested_creator_num ?? 0, videos: 0, lives: 0,
        });
        // TikTok's update time is unix seconds as text ("0" when it has none).
        const sec = Number(x.data_update_time);
        if (sec > 0) { const at = new Date(sec * 1000).toISOString(); if (!asOf || at > asOf) asOf = at; }
      }
      pageToken = r.data?.next_page_token || undefined;
      if (!pageToken || products.size === mine.size) break;
    }
  }

  // Who promotes each product: sales through their links, videos and LIVEs.
  const creators = new Map<string, CreatorResult>();
  for (const p of products.values()) {
    if (!p.creators) continue;
    const campaignId = mine.get(p.id)!.campaign_id;
    let pageToken: string | undefined;
    for (let page = 0; page < 6; page++) {
      const r = await listProductCreators(s.token, s.cipher, campaignId, p.id, { pageSize: 50, pageToken });
      if (r.code !== 0) break;
      for (const c of r.data?.promotion_creators ?? []) {
        const handle = c.creator?.user_name?.toLowerCase();
        if (!handle) continue;
        p.videos += c.video_count ?? 0;
        p.lives += c.room_count ?? 0;
        const row = creators.get(handle) ?? creators.set(handle, { handle, name: c.creator.nick_name ?? handle, avatar: c.creator.avatar_url ?? null, followers: c.creator.follower_num ?? 0, gmv: 0, videos: 0, lives: 0 }).get(handle)!;
        row.gmv += amount(c.paid_amount?.amount);
        row.videos += c.video_count ?? 0;
        row.lives += c.room_count ?? 0;
      }
      pageToken = r.data?.next_page_token || undefined;
      if (!pageToken) break;
    }
  }

  const list = [...products.values()].sort((a, b) => b.gmv - a.gmv);
  const sum = (k: "gmv" | "orders" | "videos" | "lives") => list.reduce((t, p) => t + p[k], 0);
  return {
    linked: true,
    totals: { gmv: Math.round(sum("gmv") * 100) / 100, orders: sum("orders"), creators: creators.size, videos: sum("videos"), lives: sum("lives"), live: subs.length },
    products: list,
    creators: [...creators.values()].sort((a, b) => b.gmv - a.gmv || b.videos - a.videos).slice(0, 20),
    asOf,
  };
}
