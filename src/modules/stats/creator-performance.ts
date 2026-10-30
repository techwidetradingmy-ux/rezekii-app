import type { ProductCreator } from "../../integrations/tiktok-shop/partner.ts";

/** One creator row from one campaign product (listProductCreators), tagged with where it came from. */
export type PerformanceRow = ProductCreator & { campaignId: string; productId: string };

export type CreatorTotals = {
  username: string;
  registered: boolean;
  /** Lifetime sales across all campaign products (TikTok gives no date filter). */
  gmv: number;
  currency: string;
  videos: number;
  lives: number;
  products: number;
  campaigns: number;
  /** Products where the creator requested a sample (any status except not requested). */
  samples: number;
};

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);
const sampleRequested = (status?: string) => !!status && status.replace(/[_\s]/g, "").toLowerCase() !== "notrequested";

/** Adds up per-product creator rows into one row per creator, highest GMV first. Pure: no network. */
export function summarizeCreatorPerformance(rows: PerformanceRow[], isRegistered: (username: string) => boolean): CreatorTotals[] {
  const by = new Map<string, CreatorTotals & { productIds: Set<string>; campaignIds: Set<string> }>();
  for (const r of rows) {
    const username = r.creator.user_name || r.creator.nick_name || "?";
    const t = by.get(username) ?? { username, registered: isRegistered(username), gmv: 0, currency: "", videos: 0, lives: 0, products: 0, campaigns: 0, samples: 0, productIds: new Set(), campaignIds: new Set() };
    t.gmv += num(r.paid_amount?.amount);
    t.currency ||= r.paid_amount?.currency ?? "";
    t.videos += r.video_count ?? 0;
    t.lives += r.room_count ?? 0;
    if (sampleRequested(r.free_sample_status)) t.samples++;
    t.productIds.add(r.campaignId + "/" + r.productId);
    t.campaignIds.add(r.campaignId);
    by.set(username, t);
  }
  return [...by.values()]
    .map(({ productIds, campaignIds, ...t }) => ({ ...t, products: productIds.size, campaigns: campaignIds.size }))
    .sort((a, b) => b.gmv - a.gmv);
}
