/**
 * TikTok Shop Open API Integration Layer
 * =========================================
 * Techwide Marketing Sdn Bhd — Certified MCN & TAP Partner (Malaysia)
 *
 * CURRENT STATE: Mock data mode
 * When TikTok Shop partner credentials arrive, set the env vars below
 * and flip TIKTOK_SHOP_ENABLED=true in .env.local
 *
 * Relevant TikTok Shop Open API docs:
 * - Products:    https://partner.tiktokshop.com/docv2/page/6507eda7b99d5302be949ba9
 * - Affiliate:   https://partner.tiktokshop.com/docv2/page/affiliate
 * - Auth:        https://partner.tiktokshop.com/docv2/page/6507eda7b99d5302be949b9d
 * - Sandbox:     partner.tiktokshop.com/v2_sandbox (MY region — already logged in as "Rezekii")
 *
 * Required env vars:
 *   TIKTOK_SHOP_APP_KEY        — from TikTok Shop Partner Center
 *   TIKTOK_SHOP_APP_SECRET     — from Partner Center
 *   TIKTOK_SHOP_ACCESS_TOKEN   — OAuth 2.0 token (per-shop)
 *   TIKTOK_SHOP_SHOP_ID        — Target shop ID
 *   TIKTOK_SHOP_ENABLED        — "true" to use live API
 */

import { products, campaigns, earningsWeek, topPosts } from "./mock-data";
import type { Product, Campaign, EarningsDay, Post } from "./mock-data";

const BASE_URL = "https://open-api.tiktokglobalshop.com";
const APP_KEY  = process.env.TIKTOK_SHOP_APP_KEY  ?? "";
const SECRET   = process.env.TIKTOK_SHOP_APP_SECRET ?? "";
const TOKEN    = process.env.TIKTOK_SHOP_ACCESS_TOKEN ?? "";
const SHOP_ID  = process.env.TIKTOK_SHOP_SHOP_ID ?? "";
const ENABLED  = process.env.TIKTOK_SHOP_ENABLED === "true";

// ─── Signature helper ────────────────────────────────────────────────────────
// TikTok Shop API requires HMAC-SHA256 signature on all requests
// See: https://partner.tiktokshop.com/docv2/page/6507eda7b99d5302be949b9d#Signing

async function sign(path: string, params: Record<string, string>): Promise<string> {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  const message = `${SECRET}${path}${sorted}${SECRET}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function ttsRequest<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!ENABLED || !APP_KEY || !TOKEN) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const allParams = { ...params, app_key: APP_KEY, timestamp, access_token: TOKEN, shop_id: SHOP_ID };
  const signature = await sign(path, allParams);

  const url = new URL(`${BASE_URL}${path}`);
  Object.entries({ ...allParams, sign: signature }).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json", "x-tts-access-token": TOKEN },
      next: { revalidate: 300 }, // Cache 5 min
    });
    const json = await res.json();
    if (json.code !== 0) {
      console.error("[TikTok Shop API] Error:", json.message, json.code);
      return null;
    }
    return json.data as T;
  } catch (err) {
    console.error("[TikTok Shop API] Fetch error:", err);
    return null;
  }
}

// ─── Types from TikTok Shop API ───────────────────────────────────────────────

interface TTSProduct {
  id: string;
  title: string;
  main_images: { urls: string[] }[];
  skus: { price: { original_price: string; currency: string } }[];
  category_chains: { name: string }[];
  sales: { sold_count: number };
  review: { rating: number };
}

interface TTSAffiliateItem {
  product_id: string;
  commission_rate: number; // basis points (e.g. 1200 = 12%)
  product_info: TTSProduct;
}

// ─── Public API functions ────────────────────────────────────────────────────

/**
 * Fetch affiliate products available for this creator.
 * Falls back to mock data when API is not configured.
 */
export async function getAffiliateProducts(): Promise<Product[]> {
  if (!ENABLED) return products;

  const data = await ttsRequest<{ items: TTSAffiliateItem[] }>(
    "/api/affiliate/products/search",
    { page_size: "20", sort_field: "sales", sort_type: "DESC" }
  );

  if (!data?.items) return products; // fallback

  return data.items.map((item) => ({
    id: item.product_id,
    name: item.product_info.title,
    brand: "TikTok Shop",
    category: (item.product_info.category_chains[0]?.name as Product["category"]) ?? "Beauty",
    commissionRate: item.commission_rate / 100,
    priceRM: parseFloat(item.product_info.skus[0]?.price.original_price ?? "0"),
    commissionRM: (parseFloat(item.product_info.skus[0]?.price.original_price ?? "0") * item.commission_rate) / 10000,
    imageColor: "#f5fdf7",
    samplesLeft: 10,
    rating: item.product_info.review.rating,
    sold: item.product_info.sales.sold_count,
  }));
}

/**
 * Fetch creator's earnings/commission data.
 * Falls back to mock data.
 */
export async function getCreatorEarnings(): Promise<EarningsDay[]> {
  if (!ENABLED) return earningsWeek;

  const endDate = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

  const data = await ttsRequest<{ earnings: { date: string; commission: number; gmv: number }[] }>(
    "/api/affiliate/creator/earnings",
    { start_date: startDate, end_date: endDate }
  );

  if (!data?.earnings) return earningsWeek;

  return data.earnings.map((e) => ({
    date: e.date,
    label: new Date(e.date).toLocaleDateString("en-MY", { weekday: "short" }),
    gmv: e.gmv,
    commission: e.commission,
  }));
}

/**
 * Fetch active campaigns/sample opportunities for creator.
 * Falls back to mock data.
 */
export async function getCreatorCampaigns(): Promise<Campaign[]> {
  if (!ENABLED) return campaigns;

  const data = await ttsRequest<{ campaigns: Campaign[] }>(
    "/api/affiliate/campaign/list",
    { status: "ACTIVE", page_size: "20" }
  );

  return data?.campaigns ?? campaigns;
}

/**
 * Fetch creator's top performing posts with GMV attribution.
 * Falls back to mock data.
 */
export async function getTopPosts(): Promise<Post[]> {
  if (!ENABLED) return topPosts;

  const data = await ttsRequest<{ videos: Post[] }>(
    "/api/affiliate/creator/video/performance",
    { page_size: "10", sort_by: "gmv" }
  );

  return data?.videos ?? topPosts;
}

/**
 * Apply for a free product sample.
 * No mock needed — this is write-only.
 */
export async function applyForSample(productId: string): Promise<{ success: boolean; message: string }> {
  if (!ENABLED) {
    return { success: true, message: "Sample application submitted! (mock)" };
  }

  const data = await ttsRequest<{ application_id: string }>(
    "/api/affiliate/sample/apply",
    { product_id: productId }
  );

  if (!data) return { success: false, message: "Failed to submit application. Please try again." };
  return { success: true, message: `Sample application submitted! ID: ${data.application_id}` };
}

export const isMockMode = !ENABLED;
