import { callApi } from "./api.ts";

export type CreatorProfile = {
  creator_user_open_id: string;
  username: string;
  avatar?: { url: string };
  register_region?: string;
  permissions?: string[];
};

export function getCreatorProfile(accessToken: string) {
  return callApi<CreatorProfile>({
    method: "GET",
    path: "/affiliate_creator/202508/profiles",
    accessToken,
  });
}

export type GeneralLinks = {
  sharing_links?: { material_id: string; sharing_link?: string; deep_link?: string; one_link?: string }[];
  failed_materials?: { material_id: string; fail_reason: string }[];
};

/** "Creator Generate General Link": up to 50 product IDs per call. */
export function generateGeneralLinks(accessToken: string, productIds: string[], campaignId?: string) {
  return callApi<GeneralLinks>({
    method: "POST",
    path: "/affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch",
    accessToken,
    body: {
      material: { type: "PRODUCT", ids: productIds },
      ...(campaignId ? { campaign_id: campaignId } : {}),
    },
  });
}

export type TaggedLinks = {
  affiliate_sharing_links?: { tag: string; affiliate_sharing_link: string }[];
  errors?: { code: number; message: string; detail?: { tag: string; fail_reason: string } }[];
};

/** "Generate Affiliate Sharing Link": one link per tag (e.g. threads, whatsapp) for one product. */
export function generateTaggedLinks(accessToken: string, productId: string, tags: string[]) {
  return callApi<TaggedLinks>({
    method: "POST",
    path: "/affiliate_creator/202501/affiliate_sharing_links/generate_batch",
    accessToken,
    body: { material: { type: "PRODUCT", id: productId }, tags },
  });
}

export type LookedUpProduct = {
  id: string;
  title: string;
  main_image_url?: string;
  detail_link?: string;
  sales_price?: { currency: string; minimum_amount: string; maximum_amount: string };
  original_price?: { currency: string; minimum_amount: string; maximum_amount: string };
  /** Rate × 100, e.g. 1200 = 12%. */
  commission?: { rate: number; amount: string; currency: string };
  units_sold?: number;
  has_inventory?: boolean;
  shop?: { name: string };
  category_chains?: { id: string; local_name: string; is_leaf: boolean }[];
};

/** Product Lookup: open-collaboration facts for up to 20 product IDs (sent comma-joined, like TikTok's SDK). */
export function lookupProducts(accessToken: string, productIds: string[]) {
  return callApi<{ products?: LookedUpProduct[] }>({
    method: "POST",
    path: "/affiliate_creator/202509/open_collaborations/products",
    accessToken,
    query: { product_ids: productIds.join(",") },
  });
}

export type ShowcaseAddResult = { errors?: { code: number; message: string; detail?: { product_id: string } }[] };

/** Add to Showcase by product link (e.g. a TAP campaign product link). Max 20 links. */
export function addShowcaseByLink(accessToken: string, link: string) {
  return callApi<ShowcaseAddResult>({
    method: "POST",
    path: "/affiliate_creator/202405/showcases/products/add",
    accessToken,
    body: { add_type: "PRODUCT_LINK", product_link: link },
  });
}

export type ShowcaseProduct = { id: string; title?: string; main_images?: { url?: string }[]; shop?: { name?: string } };

/** The creator's showcase, one page of up to 20 products ("Get Showcase Products"). */
export function getShowcaseProducts(accessToken: string, pageToken?: string) {
  return callApi<{ products?: ShowcaseProduct[]; next_page_token?: string }>({
    method: "GET",
    path: "/affiliate_creator/202405/showcases/products",
    accessToken,
    query: { page_size: "20", origin: "SHOWCASE", ...(pageToken ? { page_token: pageToken } : {}) },
  });
}

export type Money = { amount: string; currency: string };
export type OrderSku = {
  id?: string;
  product_id?: string;
  product_name?: string;
  shop_name?: string;
  price?: Money;
  quantity?: number;
  refunded_quantity?: number;
  returned_quantity?: number;
  estimated_commission?: Money;
  actual_commission?: Money;
  actual_commission_base?: Money;
  campaign_id?: string;
  content_id?: string;
  content_type?: string;
  tag?: string;
  creator_username?: string;
};
export type AffiliateOrder = { id: string; status?: string; create_time?: number; delivery_time?: number; skus?: OrderSku[] | OrderSku };

/** The creator's own affiliate orders. With only `create_time_lt`, TikTok starts from the earliest data it has. */
export function searchCreatorOrders(accessToken: string, opts: { pageSize?: number; pageToken?: string; createTimeGe?: number; createTimeLt?: number } = {}) {
  return callApi<{ orders?: AffiliateOrder[]; next_page_token?: string }>({
    method: "POST",
    path: "/affiliate_creator/202410/orders/search",
    accessToken,
    query: { page_size: String(opts.pageSize ?? 20), ...(opts.pageToken ? { page_token: opts.pageToken } : {}) },
    body: { ...(opts.createTimeGe ? { create_time_ge: opts.createTimeGe } : {}), create_time_lt: opts.createTimeLt ?? Math.floor(Date.now() / 1000) },
  });
}
