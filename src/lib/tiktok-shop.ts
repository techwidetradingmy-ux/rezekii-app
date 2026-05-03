/**
 * TikTok Shop Open API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Signing algorithm verified against the official Node.js SDK (generate-sign.ts):
 *   1. Collect all query params except access_token + sign, sort alpha
 *   2. Concatenate: {path}{k1}{v1}{k2}{v2}...
 *   3. Append JSON body (if non-multipart + body exists)
 *   4. Wrap: {secret}{string}{secret}
 *   5. HMAC-SHA256 hex
 *
 * Docs: https://partner.tiktokshop.com/docv2/page/affiliate-seller-api-overview
 */

import crypto from 'crypto';

const BASE      = 'https://open-api.tiktokglobalshop.com';
const AUTH_BASE = 'https://auth.tiktok-shops.com';

// ── Config ────────────────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(
    process.env.TIKTOK_SHOP_APP_KEY &&
    process.env.TIKTOK_SHOP_APP_SECRET &&
    process.env.TIKTOK_SHOP_ACCESS_TOKEN &&
    process.env.TIKTOK_SHOP_SHOP_CIPHER &&
    process.env.TIKTOK_SHOP_ENABLED === 'true'
  );
}

// ── Signature ─────────────────────────────────────────────────────────────────

function generateSign(
  path: string,
  params: Record<string, string | number>,
  body?: object,
): string {
  const secret   = process.env.TIKTOK_SHOP_APP_SECRET!;
  const excluded = new Set(['access_token', 'sign']);
  const sorted   = Object.entries(params)
    .filter(([k]) => !excluded.has(k))
    .sort(([a], [b]) => a.localeCompare(b));

  let str = path + sorted.map(([k, v]) => `${k}${v}`).join('');
  if (body && Object.keys(body).length) str += JSON.stringify(body);
  str = `${secret}${str}${secret}`;

  return crypto.createHmac('sha256', secret).update(str).digest('hex');
}

// ── Core fetch ────────────────────────────────────────────────────────────────

export async function shopFetch<T = unknown>(
  path: string,
  accessToken: string,
  shopCipher: string,
  opts?: {
    method?: 'GET' | 'POST';
    body?: object;
    extra?: Record<string, string | number>;
    revalidate?: number;
  },
): Promise<T> {
  const { method = 'GET', body, extra = {}, revalidate = 0 } = opts ?? {};
  const timestamp = Math.floor(Date.now() / 1000);

  const params: Record<string, string | number> = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY!,
    timestamp,
    shop_cipher: shopCipher,
    ...extra,
  };
  params['sign'] = generateSign(path, params, body);

  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();

  const res = await fetch(`${BASE}${path}?${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': accessToken,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    next: { revalidate },
  });

  return res.json() as Promise<T>;
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export async function exchangeAuthCode(authCode: string): Promise<{
  access_token: string;
  refresh_token: string;
  open_id?: string;
  seller_name?: string;
} | null> {
  const url =
    `${AUTH_BASE}/api/v2/token/get` +
    `?app_key=${process.env.TIKTOK_SHOP_APP_KEY}` +
    `&app_secret=${process.env.TIKTOK_SHOP_APP_SECRET}` +
    `&auth_code=${authCode}` +
    `&grant_type=authorized_code`;
  const res  = await fetch(url);
  const data = await res.json();
  return data?.data ?? null;
}

export async function refreshShopToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const url =
    `${AUTH_BASE}/api/v2/token/refresh` +
    `?app_key=${process.env.TIKTOK_SHOP_APP_KEY}` +
    `&app_secret=${process.env.TIKTOK_SHOP_APP_SECRET}` +
    `&refresh_token=${refreshToken}` +
    `&grant_type=authorized_code`;
  const res  = await fetch(url);
  const data = await res.json();
  return data?.data ?? null;
}

// ── Shop cipher ───────────────────────────────────────────────────────────────

export async function getShopCipher(accessToken: string): Promise<string | null> {
  const path      = '/authorization/202309/shops';
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    app_key: process.env.TIKTOK_SHOP_APP_KEY!,
    timestamp,
  };
  params['sign'] = generateSign(path, params);

  const qs  = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { 'Content-Type': 'application/json', 'x-tts-access-token': accessToken },
  });
  const data = await res.json();
  console.log('[TikTok Shop] Shops response:', JSON.stringify(data?.data?.shops?.[0]));
  return data?.data?.shops?.[0]?.cipher ?? null;
}

// ── Date range helpers ────────────────────────────────────────────────────────

export function getRangeTimestamps(range: string): { ge: number; lt: number } {
  const now   = Math.floor(Date.now() / 1000);
  const today = new Date();

  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return Math.floor(c.getTime() / 1000);
  };

  switch (range) {
    case 'Today':
      return { ge: startOfDay(today), lt: now };
    case 'Yesterday': {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { ge: startOfDay(y), lt: startOfDay(today) };
    }
    case 'Past 7 Days':
      return { ge: now - 7 * 86400, lt: now };
    case 'Past 30 Days':
      return { ge: now - 30 * 86400, lt: now };
    case 'This Month': {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      return { ge: startOfDay(m), lt: now };
    }
    case 'Last Month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 1);
      return { ge: startOfDay(s), lt: startOfDay(e) };
    }
    default:
      return { ge: now - 30 * 86400, lt: now };
  }
}

// ── Legacy helpers (used by /api/tiktok/products and /api/tiktok/analytics) ──

export interface TikTokProduct {
  id: string; title: string; commissionRate: number;
  priceRM: number; commissionRM: number; imageUrl: string;
  category: string; rating: number; sold: number;
  brand: string; samplesLeft: number;
}

export interface TikTokCommission {
  date: string; label: string; gmv: number; commission: number;
}

export interface TikTokOrder {
  orderId: string; productId: string; productName: string;
  gmv: number; commission: number; status: string; createdAt: string;
}

export interface AnalyticsResult {
  orders: TikTokOrder[]; earnings: TikTokCommission[];
  totalGMV: number; totalCommission: number; conversionRate: number;
}

const MOCK_PRODUCTS_LEGACY: TikTokProduct[] = [
  { id:'p1', title:'Hydro Glow Serum 30ml', brand:'COSRX', category:'Beauty', commissionRate:12, priceRM:89.90, commissionRM:10.79, imageUrl:'', rating:4.9, sold:12400, samplesLeft:8 },
  { id:'p2', title:'Mango Chili Snack Pack', brand:'MyRasa', category:'Food', commissionRate:8, priceRM:24.90, commissionRM:1.99, imageUrl:'', rating:4.7, sold:8900, samplesLeft:15 },
  { id:'p3', title:'ANC Wireless Earbuds Pro', brand:'Soundcore', category:'Tech', commissionRate:6, priceRM:199.00, commissionRM:11.94, imageUrl:'', rating:4.8, sold:3200, samplesLeft:3 },
];

const MOCK_EARNINGS: TikTokCommission[] = [
  { date:'2026-04-28', label:'Mon', gmv:1240, commission:148.80 },
  { date:'2026-04-29', label:'Tue', gmv:980,  commission:117.60 },
  { date:'2026-04-30', label:'Wed', gmv:2100, commission:252.00 },
  { date:'2026-05-01', label:'Thu', gmv:1750, commission:210.00 },
  { date:'2026-05-02', label:'Fri', gmv:3200, commission:384.00 },
  { date:'2026-05-03', label:'Sat', gmv:4100, commission:492.00 },
  { date:'2026-05-04', label:'Sun', gmv:2860, commission:343.20 },
];

export async function getProducts(): Promise<TikTokProduct[]> {
  return MOCK_PRODUCTS_LEGACY;
}

export async function getOrderAnalytics(
  _config?: unknown,
  _dateRange?: { start: string; end: string },
): Promise<AnalyticsResult> {
  const total = MOCK_EARNINGS.reduce((s, e) => s + e.commission, 0);
  return {
    orders: [], earnings: MOCK_EARNINGS,
    totalGMV: MOCK_EARNINGS.reduce((s, e) => s + e.gmv, 0),
    totalCommission: total, conversionRate: 3.8,
  };
}

// ── Affiliate Creator Order search ────────────────────────────────────────────

interface OrderSku {
  product_id?: string;
  product_name?: string;
  shop_name?: string;
  quantity?: number;
  content_type?: string;   // VIDEO | LIVE | SHOP
  price?: { amount?: string; currency?: string };
  actual_commission?: { amount?: string };
  estimated_commission?: { amount?: string };
  status?: string;
}

interface Order {
  id?: string;
  create_time?: number;
  status?: string;
  skus?: OrderSku[];
}

export interface OrderSummary {
  totalGMV: number;            // sum of price.amount * quantity (settled orders)
  totalCommission: number;     // sum of actual_commission.amount
  productsSold: number;        // total SKU quantity
  productTypes: number;        // distinct product_ids
  videoGMV: number;
  liveGMV: number;
  dailyGMV: Record<string, number>;   // "YYYY-MM-DD" → GMV
  topProducts: { productId: string; name: string; gmv: number; units: number }[];
  nicheGMV: Record<string, number>;   // category name → GMV (inferred from product name for now)
}

export async function searchCreatorOrders(
  accessToken: string,
  shopCipher: string,
  range: string,
): Promise<OrderSummary | null> {
  const { ge, lt } = getRangeTimestamps(range);
  const path = '/affiliate_creator/202410/orders/search';

  let allOrders: Order[] = [];
  let pageToken: string | undefined;

  // paginate up to 5 pages (500 orders max)
  for (let page = 0; page < 5; page++) {
    const body: Record<string, unknown> = {
      create_time_ge: ge,
      create_time_lt: lt,
    };
    if (pageToken) body['page_token'] = pageToken;

    const resp = await shopFetch<{
      code?: number;
      data?: { orders?: Order[]; next_page_token?: string; total_count?: number };
    }>(path, accessToken, shopCipher, {
      method: 'POST',
      body,
      extra: { page_size: 100 },
    });

    if (resp.code !== 0 || !resp.data?.orders?.length) break;
    allOrders = allOrders.concat(resp.data.orders);
    if (!resp.data.next_page_token) break;
    pageToken = resp.data.next_page_token;
  }

  if (!allOrders.length) return null;

  // aggregate
  let totalGMV        = 0;
  let totalCommission = 0;
  let productsSold    = 0;
  let videoGMV        = 0;
  let liveGMV         = 0;
  const dailyGMV:    Record<string, number> = {};
  const productMap:  Record<string, { name: string; gmv: number; units: number }> = {};

  for (const order of allOrders) {
    if (order.status === 'REFUNDED' || order.status === 'UNSPECIFIED') continue;
    const date = order.create_time
      ? new Date(order.create_time * 1000).toISOString().slice(0, 10)
      : 'unknown';

    for (const sku of order.skus ?? []) {
      const qty      = sku.quantity ?? 0;
      const price    = parseFloat(sku.price?.amount ?? '0');
      const gmv      = price * qty;
      const comm     = parseFloat(sku.actual_commission?.amount ?? sku.estimated_commission?.amount ?? '0');
      const ct       = sku.content_type ?? '';

      totalGMV        += gmv;
      totalCommission += comm;
      productsSold    += qty;
      dailyGMV[date]   = (dailyGMV[date] ?? 0) + gmv;

      if (ct === 'VIDEO') videoGMV += gmv;
      if (ct === 'LIVE')  liveGMV  += gmv;

      const pid = sku.product_id ?? 'unknown';
      if (!productMap[pid]) productMap[pid] = { name: sku.product_name ?? pid, gmv: 0, units: 0 };
      productMap[pid].gmv   += gmv;
      productMap[pid].units += qty;
    }
  }

  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b.gmv - a.gmv)
    .slice(0, 5)
    .map(([productId, v]) => ({ productId, ...v }));

  return {
    totalGMV,
    totalCommission,
    productsSold,
    productTypes: Object.keys(productMap).length,
    videoGMV,
    liveGMV,
    dailyGMV,
    topProducts,
    nicheGMV: {},
  };
}

// ── Finance: available to withdraw ────────────────────────────────────────────

export async function getAvailableBalance(
  accessToken: string,
  shopCipher: string,
): Promise<number> {
  const path = '/finance/202309/statements';
  const resp = await shopFetch<{
    code?: number;
    data?: { statements?: { withdrawable_balance?: { amount?: string } }[] };
  }>(path, accessToken, shopCipher, {
    extra: {
      sort_field:     'STATEMENT_TIME',
      sort_order:     'DESC',
      page_size:      1,
    },
  });

  if (resp.code !== 0) return 0;
  const bal = resp.data?.statements?.[0]?.withdrawable_balance?.amount;
  return bal ? parseFloat(bal) : 0;
}

// ── Creator performance (Affiliate Seller API) ────────────────────────────────

export async function getCreatorPerf(
  accessToken: string,
  shopCipher: string,
  creatorOpenId: string,
): Promise<{
  videoGMV: number;
  liveGMV: number;
  avgVideoPlays: number;
  categoryGMV: { name: string; pct: number; gmv: number }[];
} | null> {
  const path = `/affiliate_seller/202508/marketplace_creators/${creatorOpenId}`;
  const resp = await shopFetch<{
    code?: number;
    data?: {
      creator?: {
        video_gmv?: { amount?: string };
        live_gmv?: { amount?: string };
        avg_ec_video_play_count?: number;
        category_gmv_distribution?: { category_name?: string; gmv?: { amount?: string }; ratio?: number }[];
      };
    };
  }>(path, accessToken, shopCipher, { revalidate: 3600 });

  if (resp.code !== 0 || !resp.data?.creator) return null;
  const c = resp.data.creator;

  const catColors = ['#e8005a', '#f5a623', '#8b5cf6', '#25f4ee', '#00c073'];
  const cats = (c.category_gmv_distribution ?? []).map((d, i) => ({
    name: d.category_name ?? `Cat ${i + 1}`,
    pct:  Math.round((d.ratio ?? 0) * 100),
    gmv:  parseFloat(d.gmv?.amount ?? '0'),
    color: catColors[i % catColors.length],
  }));

  return {
    videoGMV:      parseFloat(c.video_gmv?.amount ?? '0'),
    liveGMV:       parseFloat(c.live_gmv?.amount  ?? '0'),
    avgVideoPlays: c.avg_ec_video_play_count ?? 0,
    categoryGMV:   cats,
  };
}
