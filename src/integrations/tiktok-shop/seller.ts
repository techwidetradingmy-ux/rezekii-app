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

export type BestsellingCreator = { rank?: number; username?: string; nickname?: string; avatar_url?: string; follower_count?: number; like_count?: number; gmv_range?: Range };

/**
 * Get Bestselling Creators: TikTok's top 100 sellers' creators for the market (1D, 7D or 30D).
 * Not in the local API spec, so the reply is typed loosely until a real call confirms its shape.
 */
export function getBestsellingCreators(accessToken: string, cipher: string, timeSlot: "1D" | "7D" | "30D" = "30D", version = "202511") {
  return callApi<Record<string, unknown>>({
    method: "GET",
    path: `/analytics/${version}/creators/bestselling`,
    accessToken,
    query: { shop_cipher: cipher, time_slot: timeSlot },
  });
}
