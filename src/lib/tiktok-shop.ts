/**
 * TikTok Shop Open API Client
 * ============================================================
 * Docs: https://partner.tiktokshop.com/docv2/page/affiliate-seller-api-overview
 *
 * Falls back to realistic mock data when credentials are missing.
 * Set env vars (see .env.example) and TIKTOK_SHOP_ENABLED=true to go live.
 */

// ─── Config ──────────────────────────────────────────────────

export const TIKTOK_SHOP_BASE = "https://open-api.tiktokglobalshop.com";

export interface TikTokShopConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopId: string;
}

function getConfig(): TikTokShopConfig {
  return {
    appKey:      process.env.TIKTOK_SHOP_APP_KEY      ?? "",
    appSecret:   process.env.TIKTOK_SHOP_APP_SECRET   ?? "",
    accessToken: process.env.TIKTOK_SHOP_ACCESS_TOKEN ?? "",
    shopId:      process.env.TIKTOK_SHOP_SHOP_ID      ?? "",
  };
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.appKey && cfg.appSecret && cfg.accessToken && cfg.shopId &&
            process.env.TIKTOK_SHOP_ENABLED === "true");
}

// ─── Signature (HMAC-SHA256) ─────────────────────────────────

async function sign(
  path: string,
  params: Record<string, string>,
  secret: string,
): Promise<string> {
  const sorted  = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  const message = `${secret}${path}${sorted}${secret}`;
  const encoder = new TextEncoder();
  const key     = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Base request ────────────────────────────────────────────

async function ttsRequest<T>(
  path: string,
  params: Record<string, string> = {},
  config = getConfig(),
): Promise<T | null> {
  const timestamp  = Math.floor(Date.now() / 1000).toString();
  const allParams  = {
    ...params,
    app_key:      config.appKey,
    timestamp,
    access_token: config.accessToken,
    shop_id:      config.shopId,
  };
  const signature  = await sign(path, allParams, config.appSecret);
  const url        = new URL(`${TIKTOK_SHOP_BASE}${path}`);

  Object.entries({ ...allParams, sign: signature }).forEach(([k, v]) =>
    url.searchParams.set(k, v),
  );

  try {
    const res  = await fetch(url.toString(), {
      headers: {
        "Content-Type":      "application/json",
        "x-tts-access-token": config.accessToken,
      },
      next: { revalidate: 300 }, // 5-min cache
    });
    const json = await res.json();
    if (json.code !== 0) {
      console.error("[TikTok Shop] Error:", json.message, `(code ${json.code})`);
      return null;
    }
    return json.data as T;
  } catch (err) {
    console.error("[TikTok Shop] Fetch error:", err);
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────

export interface TikTokProduct {
  id: string;
  title: string;
  commissionRate: number;   // percentage, e.g. 12
  priceRM: number;
  commissionRM: number;
  imageUrl: string;
  category: string;
  rating: number;
  sold: number;
  brand: string;
  samplesLeft: number;
}

export interface TikTokCommission {
  date: string;             // "YYYY-MM-DD"
  label: string;
  gmv: number;
  commission: number;
}

export interface TikTokOrder {
  orderId: string;
  productId: string;
  productName: string;
  gmv: number;
  commission: number;
  status: string;
  createdAt: string;
}

export interface AnalyticsResult {
  orders: TikTokOrder[];
  earnings: TikTokCommission[];
  totalGMV: number;
  totalCommission: number;
  conversionRate: number;
}

export interface CreatorPerformance {
  totalVideos: number;
  totalLives: number;
  totalViews: number;
  totalGMV: number;
  totalCommission: number;
  topProducts: TikTokProduct[];
}

// ─── Mock data (Malaysian market) ────────────────────────────

const mockProducts: TikTokProduct[] = [
  { id: "p1", title: "Hydro Glow Serum 30ml",   brand: "COSRX",          category: "Beauty",  commissionRate: 12, priceRM: 89.90,  commissionRM: 10.79, imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop", rating: 4.9, sold: 12400, samplesLeft: 8 },
  { id: "p2", title: "Mango Chili Snack Pack",   brand: "MyRasa",         category: "Food",    commissionRate: 8,  priceRM: 24.90,  commissionRM: 1.99,  imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop", rating: 4.7, sold: 8900,  samplesLeft: 15 },
  { id: "p3", title: "ANC Wireless Earbuds Pro", brand: "Soundcore",      category: "Tech",    commissionRate: 6,  priceRM: 199.00, commissionRM: 11.94, imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop", rating: 4.8, sold: 3200,  samplesLeft: 3 },
  { id: "p4", title: "Linen Wide Leg Trousers",  brand: "ZALORA Studio",  category: "Fashion", commissionRate: 15, priceRM: 129.00, commissionRM: 19.35, imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=400&h=400&fit=crop", rating: 4.6, sold: 5600,  samplesLeft: 6 },
  { id: "p5", title: "Bamboo Aroma Diffuser",    brand: "ScentCo",        category: "Home",    commissionRate: 10, priceRM: 79.00,  commissionRM: 7.90,  imageUrl: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400&h=400&fit=crop", rating: 4.8, sold: 7800,  samplesLeft: 12 },
];

const mockEarnings: TikTokCommission[] = [
  { date: "2026-04-21", label: "Mon", gmv: 1240, commission: 148.80 },
  { date: "2026-04-22", label: "Tue", gmv: 980,  commission: 117.60 },
  { date: "2026-04-23", label: "Wed", gmv: 2100, commission: 252.00 },
  { date: "2026-04-24", label: "Thu", gmv: 1750, commission: 210.00 },
  { date: "2026-04-25", label: "Fri", gmv: 3200, commission: 384.00 },
  { date: "2026-04-26", label: "Sat", gmv: 4100, commission: 492.00 },
  { date: "2026-04-27", label: "Sun", gmv: 2860, commission: 343.20 },
];

// ─── Public API ───────────────────────────────────────────────

/**
 * Get affiliate products available for this creator.
 * Falls back to mock data when credentials are missing.
 */
export async function getProducts(config?: TikTokShopConfig): Promise<TikTokProduct[]> {
  if (!isConfigured()) return mockProducts;

  const cfg  = config ?? getConfig();
  const data = await ttsRequest<{
    items: Array<{
      product_id: string;
      commission_rate: number;
      product_info: {
        title: string;
        main_images: { urls: string[] }[];
        skus: { price: { original_price: string } }[];
        category_chains: { name: string }[];
        sales: { sold_count: number };
        review: { rating: number };
      };
    }>;
  }>("/api/affiliate/products/search", { page_size: "20", sort_field: "sales", sort_type: "DESC" }, cfg);

  if (!data?.items) return mockProducts;

  return data.items.map((item) => {
    const priceRM       = parseFloat(item.product_info.skus[0]?.price.original_price ?? "0");
    const commissionRate = item.commission_rate / 100;
    return {
      id:             item.product_id,
      title:          item.product_info.title,
      brand:          "TikTok Shop",
      category:       item.product_info.category_chains[0]?.name ?? "General",
      commissionRate,
      priceRM,
      commissionRM:   (priceRM * commissionRate) / 100,
      imageUrl:       item.product_info.main_images[0]?.urls[0] ?? "",
      rating:         item.product_info.review.rating,
      sold:           item.product_info.sales.sold_count,
      samplesLeft:    10,
    };
  });
}

/**
 * Get affiliate commission earnings for a date range.
 */
export async function getAffiliateCommissions(
  config?: TikTokShopConfig,
  dateRange?: { start: string; end: string },
): Promise<TikTokCommission[]> {
  if (!isConfigured()) return mockEarnings;

  const cfg   = config ?? getConfig();
  const end   = dateRange?.end   ?? new Date().toISOString().split("T")[0].replace(/-/g, "");
  const start = dateRange?.start ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

  const data  = await ttsRequest<{
    earnings: Array<{ date: string; commission: number; gmv: number }>;
  }>("/api/affiliate/creator/earnings", { start_date: start, end_date: end }, cfg);

  if (!data?.earnings) return mockEarnings;

  return data.earnings.map((e) => ({
    date:       e.date,
    label:      new Date(e.date).toLocaleDateString("en-MY", { weekday: "short" }),
    gmv:        e.gmv,
    commission: e.commission,
  }));
}

/**
 * Get order analytics for a date range.
 */
export async function getOrderAnalytics(
  config?: TikTokShopConfig,
  dateRange?: { start: string; end: string },
): Promise<AnalyticsResult> {
  const earnings     = await getAffiliateCommissions(config, dateRange);
  const totalGMV     = earnings.reduce((s, d) => s + d.gmv, 0);
  const totalComm    = earnings.reduce((s, d) => s + d.commission, 0);

  if (!isConfigured()) {
    return {
      orders:           [],
      earnings,
      totalGMV,
      totalCommission:  totalComm,
      conversionRate:   3.8,
    };
  }

  const cfg  = config ?? getConfig();
  const end  = dateRange?.end   ?? new Date().toISOString().split("T")[0].replace(/-/g, "");
  const start= dateRange?.start ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

  const data = await ttsRequest<{ orders: TikTokOrder[] }>(
    "/api/order/list",
    { create_time_from: start, create_time_to: end, page_size: "50" },
    cfg,
  );

  return {
    orders:          data?.orders ?? [],
    earnings,
    totalGMV,
    totalCommission: totalComm,
    conversionRate:  3.8,
  };
}

/**
 * Get creator performance summary.
 */
export async function getCreatorPerformance(config?: TikTokShopConfig): Promise<CreatorPerformance> {
  const products = await getProducts(config);

  if (!isConfigured()) {
    return {
      totalVideos:     87,
      totalLives:      24,
      totalViews:      919000,
      totalGMV:        17630,
      totalCommission: 2131.20,
      topProducts:     products.slice(0, 4),
    };
  }

  const cfg  = config ?? getConfig();
  const data = await ttsRequest<CreatorPerformance>(
    "/api/affiliate/creator/performance",
    { page_size: "10" },
    cfg,
  );

  return data ?? {
    totalVideos:     87,
    totalLives:      24,
    totalViews:      919000,
    totalGMV:        17630,
    totalCommission: 2131.20,
    topProducts:     products.slice(0, 4),
  };
}

/**
 * Apply for a free product sample.
 */
export async function applySample(
  productId: string,
  config?: TikTokShopConfig,
): Promise<{ success: boolean; message: string; applicationId?: string }> {
  if (!isConfigured()) {
    return { success: true, message: "Sample application submitted! (mock mode)", applicationId: `mock-${Date.now()}` };
  }

  const cfg  = config ?? getConfig();
  const data = await ttsRequest<{ application_id: string }>(
    "/api/affiliate/sample/apply",
    { product_id: productId },
    cfg,
  );

  if (!data) return { success: false, message: "Failed to submit application. Please try again." };
  return { success: true, message: "Sample application submitted successfully!", applicationId: data.application_id };
}
