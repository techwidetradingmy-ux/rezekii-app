import { callApi } from "./api.ts";
import type { AffiliateOrder } from "./creator.ts";

export type CategoryAsset = { cipher: string; target_market?: string; category?: { id: number; name: string } };

/** The partner's authorized business categories. Each `cipher` is required by every partner API call. */
export function getCategoryAssets(accessToken: string) {
  return callApi<{ category_assets?: CategoryAsset[] }>({ method: "GET", path: "/authorization/202405/category_assets", accessToken });
}

export type Campaign = { id: string; name: string; status: string; campaign_start_time?: number; campaign_end_time?: number; registration_start_time?: number; registration_end_time?: number };

/** Techwide's own TAP campaigns (type MY_CAMPAIGNS). */
export function listCampaigns(accessToken: string, cipher: string, pageSize = 20) {
  return callApi<{ campaigns?: Campaign[]; next_page_token?: string; total_count?: number }>({
    method: "GET",
    path: "/affiliate_partner/202405/campaigns",
    accessToken,
    query: { category_asset_cipher: cipher, page_size: String(pageSize), type: "MY_CAMPAIGNS" },
  });
}

export type CampaignProduct = {
  id: string;
  name: string;
  shop_name?: string;
  main_image_url?: string;
  review_status?: string;
  is_available?: boolean;
  product_sales?: number;
  inventory?: number;
  sample_quota?: number;
  /** Rates × 100, e.g. 2000 = 20%. */
  open_collaboration_commission_rate?: number;
  partner_commission_rate?: number;
  creator_commission_rate?: number;
  lowest_price?: { amount: string; currency: string };
  highest_price?: { amount: string; currency: string };
};

export function listCampaignProducts(accessToken: string, cipher: string, campaignId: string, pageSize = 20) {
  return callApi<{ products?: CampaignProduct[]; next_page_token?: string }>({
    method: "GET",
    path: `/affiliate_partner/202405/campaigns/${campaignId}/products`,
    accessToken,
    query: { category_asset_cipher: cipher, page_size: String(pageSize) },
  });
}

/** A promotion link for one campaign product; sales through it count for the TAP campaign. */
export function campaignProductLink(accessToken: string, cipher: string, campaignId: string, productId: string, creatorRate?: number) {
  return callApi<{ product_promotion_link?: string }>({
    method: "POST",
    path: `/affiliate_partner/202405/campaigns/${campaignId}/products/${productId}/promotion_link/generate`,
    accessToken,
    query: { category_asset_cipher: cipher },
    body: creatorRate ? { creator_commission_rate: creatorRate } : undefined,
  });
}


/** Every order through Techwide's TAP campaigns (all creators). With only `create_time_lt`, TikTok starts from the earliest data it has. */
export function searchTapOrders(accessToken: string, cipher: string, opts: { pageSize?: number; pageToken?: string; campaignId?: string; createTimeLt?: number } = {}) {
  return callApi<{ orders?: AffiliateOrder[]; next_page_token?: string; total_count?: number }>({
    method: "POST",
    path: "/affiliate_partner/202411/orders/search",
    accessToken,
    query: { category_asset_cipher: cipher, page_size: String(opts.pageSize ?? 100), ...(opts.pageToken ? { page_token: opts.pageToken } : {}) },
    body: { ...(opts.campaignId ? { campaign_id: opts.campaignId } : {}), create_time_lt: opts.createTimeLt ?? Math.floor(Date.now() / 1000) },
  });
}
