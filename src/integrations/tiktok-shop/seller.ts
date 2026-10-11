import { callApi } from "./api.ts";

export type AuthorizedShop = { id: string; name: string; cipher: string; code?: string; region?: string; seller_type?: string };

/** Shops the seller authorized for Rezekii, each with the `cipher` every shop API call needs. */
export function getAuthorizedShops(accessToken: string) {
  return callApi<{ shops?: AuthorizedShop[] }>({ method: "GET", path: "/authorization/202309/shops", accessToken });
}

type Amount = { amount?: string; currency?: string };
type Range = { minimum_amount?: string; maximum_amount?: string; currency?: string; formatted_range?: string };

export type MarketplaceCreator = {
  creator_open_id?: string;
  username: string;
  nickname?: string;
  avatar?: { url?: string };
  follower_count?: number;
  category_ids?: string[];
  /** Precise GMV only when the creator shares it; otherwise `gmv_range`. Last 30 days. */
  gmv?: Amount;
  gmv_range?: Range;
  video_gmv?: Amount;
  live_gmv?: Amount;
  units_sold_range?: Range;
  avg_ec_video_view_count?: number;
  avg_ec_live_uv?: number;
  selection_region?: string;
};

export type CreatorSearch = {
  keyword?: string;
  gmv_ranges?: string[];
  units_sold_ranges?: string[];
  follower_demographics?: { count_range?: { count_ge?: number; count_le?: number } };
  search_key?: string;
};

/** Seller Search Creator on Marketplace: creators on TikTok's Creator Marketplace, last 30 days. Page size is 12 or 20. */
export function searchMarketplaceCreators(accessToken: string, cipher: string, filters: CreatorSearch = {}, opts: { pageSize?: 12 | 20; pageToken?: string } = {}) {
  return callApi<{ creators?: MarketplaceCreator[]; next_page_token?: string; search_key?: string }>({
    method: "POST",
    path: "/affiliate_seller/202508/marketplace_creators/search",
    accessToken,
    query: { shop_cipher: cipher, page_size: String(opts.pageSize ?? 20), ...(opts.pageToken ? { page_token: opts.pageToken } : {}) },
    body: filters,
  });
}

/** `gmv_range` is a plain string here, e.g. "MYR38562398.30~MYR60426989.28". */
export type BestsellingCreator = { rank?: number; open_id?: string; user_name?: string; nick_name?: string; followers_count?: number; likes_count?: number; gmv_range?: string };

/**
 * Get Bestselling Creators: TikTok's top 100 creators in the market for the period ending on `date` (YYYY-MM-DD).
 * Not in the local API spec; confirmed by a real call (2026-10-12): `date` and `author_type` (ALL or AFFILIATE) are required.
 */
export function getBestsellingCreators(accessToken: string, cipher: string, opts: { date: string; timeSlot?: "1D" | "7D" | "30D"; authorType?: "ALL" | "AFFILIATE" }) {
  return callApi<{ creators?: BestsellingCreator[] }>({
    method: "GET",
    path: "/analytics/202511/creators/bestselling",
    accessToken,
    query: { shop_cipher: cipher, date: opts.date, time_slot: opts.timeSlot ?? "30D", author_type: opts.authorType ?? "ALL" },
  });
}
