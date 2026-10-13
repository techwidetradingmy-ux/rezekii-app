import { callApi } from "./api.ts";
import type { Money } from "./creator.ts";

export type CategoryAsset = { cipher: string; target_market?: string; category?: { id: number; name: string } };

/** The partner's authorized business categories. Each `cipher` is required by every partner API call. */
export function getCategoryAssets(accessToken: string) {
  return callApi<{ category_assets?: CategoryAsset[] }>({ method: "GET", path: "/authorization/202405/category_assets", accessToken });
}

/** TikTok's name for the TAP (affiliate partner) category. Campaign and TAP order calls reject every other category's cipher. */
export const TAP_CATEGORY = "Seller and Scalable Creator Match-Up";

/** The partner's TAP category asset for one market. */
export function tapAsset(assets: CategoryAsset[], market = "MY"): CategoryAsset | undefined {
  return assets.find((a) => a.category?.name === TAP_CATEGORY && (a.target_market ?? "").toUpperCase() === market);
}

export type Campaign = { id: string; name: string; status: string; campaign_start_time?: number; campaign_end_time?: number; registration_start_time?: number; registration_end_time?: number };
export type CampaignStatus = "READY" | "UPCOMING" | "ONGOING" | "CLOSED" | "UNSPECIFIED";

/**
 * Techwide's own TAP campaigns (type MY_CAMPAIGNS). `status` is always sent: without it TikTok
 * rejects the call (16032001 "review_status"), although its docs mark it optional. UNSPECIFIED = all.
 */
export function listCampaigns(accessToken: string, cipher: string, opts: { status?: CampaignStatus; pageSize?: number; pageToken?: string } = {}) {
  return callApi<{ campaigns?: Campaign[]; next_page_token?: string; total_count?: number }>({
    method: "GET",
    path: "/affiliate_partner/202405/campaigns",
    accessToken,
    query: { category_asset_cipher: cipher, page_size: String(opts.pageSize ?? 20), type: "MY_CAMPAIGNS", status: opts.status ?? "UNSPECIFIED", ...(opts.pageToken ? { page_token: opts.pageToken } : {}) },
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
  /** The most a link can give the creator. */
  total_commission_rate?: number;
  lowest_price?: { amount: string; currency: string };
  highest_price?: { amount: string; currency: string };
};

export type ProductReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "PENDING_CLOSED" | "CLOSED";

/** Products in one campaign; approved ones by default, since only those can be promoted. */
export function listCampaignProducts(accessToken: string, cipher: string, campaignId: string, opts: { reviewStatus?: ProductReviewStatus; pageSize?: number; pageToken?: string } = {}) {
  return callApi<{ products?: CampaignProduct[]; next_page_token?: string; total_count?: number }>({
    method: "GET",
    path: `/affiliate_partner/202405/campaigns/${campaignId}/products`,
    accessToken,
    query: { category_asset_cipher: cipher, page_size: String(opts.pageSize ?? 20), review_status: opts.reviewStatus ?? "APPROVED", ...(opts.pageToken ? { page_token: opts.pageToken } : {}) },
  });
}

/**
 * A promotion link for one campaign product; sales through it count for the TAP campaign.
 * `creatorRate` (×100, e.g. 1100 = 11%) is required by TikTok; 0 is allowed. It cannot exceed the product's total rate.
 */
export function campaignProductLink(accessToken: string, cipher: string, campaignId: string, productId: string, creatorRate: number) {
  return callApi<{ product_promotion_link?: string }>({
    method: "POST",
    path: `/affiliate_partner/202405/campaigns/${campaignId}/products/${productId}/promotion_link/generate`,
    accessToken,
    query: { category_asset_cipher: cipher },
    body: { creator_commission_rate: creatorRate },
  });
}

// TikTok retired TAP order search (202411/orders/search) on 2026-06-30. The calls below replace it.
// They have no date filter: every amount is a lifetime total. Numbers arrive as strings ("911.40", "1000").

type Page = { pageSize?: number; pageToken?: string };
const pageQuery = (cipher: string, p: Page, size: number) => ({ category_asset_cipher: cipher, page_size: String(p.pageSize ?? size), ...(p.pageToken ? { page_token: p.pageToken } : {}) });

export type CampaignProductStats = {
  campaign_product_detail?: {
    product_id: string;
    product_name?: string;
    product_status?: string;
    /** Rates ×100, e.g. "1000" = 10%. */
    plan_commission_percent?: string;
    creator_commission_percent?: string;
    partner_commission_percent?: string;
    total_commission_percent?: string;
    product_price?: { currency?: string; min_price?: string; max_price?: string };
    indicator_data?: { actual_amount?: string; actual_order_num?: string; paid_order_num?: string; estimated_amount?: string; actual_partner_commission?: string; estimated_partner_commission?: string };
  };
  promoted_creator_num?: number;
  collaborated_creators_num?: number;
  creator_sales_num?: number;
  sample_requested_creator_num?: number;
  data_update_time?: string;
};

/** Sales and creator counts for each product in one campaign. */
export function listCampaignProductStats(accessToken: string, cipher: string, campaignId: string, page: Page = {}) {
  return callApi<{ campaign_product_statistics?: CampaignProductStats[]; next_page_token?: string; total_count?: number }>({
    method: "GET",
    path: `/affiliate_partner/202501/campaigns/${campaignId}/products/performance`,
    accessToken,
    query: pageQuery(cipher, page, 50),
  });
}

export type ProductCreator = {
  affiliate_product_id: string;
  /** Rate ×100. */
  commission?: string;
  /** `creator_temp_id` is valid for one hour. */
  creator: { creator_temp_id: string; user_name?: string; nick_name?: string; follower_num?: number; avatar_url?: string };
  paid_amount?: Money;
  video_count?: number;
  room_count?: number;
  /** e.g. "NotRequested" (TikTok's docs say NOT_REQUESTED). */
  free_sample_status?: string;
  effective_start_time?: string;
  effective_end_time?: string;
};

/** Every creator promoting one campaign product: sales, video and LIVE counts, rate and sample status. */
export function listProductCreators(accessToken: string, cipher: string, campaignId: string, productId: string, page: Page = {}) {
  return callApi<{ promotion_creators?: ProductCreator[]; next_page_token?: string; total_creator_count?: number }>({
    method: "GET",
    path: `/affiliate_partner/202501/campaigns/${campaignId}/products/${productId}/performance`,
    accessToken,
    query: pageQuery(cipher, page, 50),
  });
}

export type CreatorContent = {
  content_type?: string;
  /** Unix seconds as a string. */
  published_date?: string;
  /** Formatted with the currency, e.g. "RM12.30". */
  paid_amount?: string;
  paid_order_num?: string;
  view_count?: string;
  like_count?: string;
  comment_num?: string;
  linked_tiktok_video?: string;
  source_url?: string;
};

/**
 * One creator's videos or LIVEs for one campaign product. Version 202501 on purpose: the documented 202508 version
 * rejects the `creator_temp_id` from listProductCreators ("Invalid open_id").
 */
export function listCreatorContent(accessToken: string, cipher: string, campaignId: string, productId: string, creator: ProductCreator, contentType: "VIDEO" | "LIVE_ROOM") {
  return callApi<{ creator_content_statistics?: CreatorContent[] }>({
    method: "GET",
    path: `/affiliate_partner/202501/campaigns/${campaignId}/products/${productId}/creator/${creator.creator.creator_temp_id}/content/statistics`,
    accessToken,
    query: { category_asset_cipher: cipher, affiliate_product_id: creator.affiliate_product_id, content_type: contentType },
  });
}

export type SampleTracking = {
  shipping_provider_name?: string;
  /** Unix time (seconds or milliseconds, as a string or number). */
  estimated_latest_delivery_date?: string | number;
  tracking_results?: { tracking_event_description?: string; tracking_event_update_date?: string | number }[];
};

/** Where one creator's free sample is: courier, tracking events and the latest expected delivery. */
export function getSampleTracking(accessToken: string, cipher: string, campaignId: string, productId: string, creatorTempId: string) {
  return callApi<{ sample_status?: SampleTracking }>({
    method: "GET",
    path: `/affiliate_partner/202508/campaigns/${campaignId}/products/${productId}/creator/${creatorTempId}/content/statistics/sample/status`,
    accessToken,
    query: { category_asset_cipher: cipher },
  });
}
