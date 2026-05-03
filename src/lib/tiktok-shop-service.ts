/**
 * TikTok Shop API Service
 * Server-side only — do NOT import from client components.
 *
 * Tokens come from httpOnly cookies set during TikTok Shop OAuth:
 *   tts_access_token  — set by /api/auth/tiktok-shop/callback
 *   tts_shop_cipher   — set by /api/auth/tiktok-shop/callback
 *
 * App credentials come from env vars:
 *   TIKTOK_SHOP_APP_KEY
 *   TIKTOK_SHOP_APP_SECRET
 */

import { ClientConfiguration, TikTokShopNodeApiClient } from '@/lib/tiktokshop-sdk';

// ─── Bootstrap ──────────────────────────────────────────────────────────────

const APP_KEY    = process.env.TIKTOK_SHOP_APP_KEY    ?? '';
const APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET ?? '';

ClientConfiguration.globalConfig.app_key    = APP_KEY;
ClientConfiguration.globalConfig.app_secret = APP_SECRET;

let _client: TikTokShopNodeApiClient | null = null;

function getClient(): TikTokShopNodeApiClient {
  if (!_client) {
    _client = new TikTokShopNodeApiClient({ config: { sandbox: false } as ClientConfiguration });
  }
  return _client;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShopOrder {
  order_id:        string;
  create_time:     number;   // unix timestamp (seconds)
  product_id:      string;
  product_name:    string;
  sku_id:          string;
  quantity:        number;
  sale_price:      number;   // in currency's smallest unit (e.g. cents)
  currency:        string;
  commission_rate: number;   // hundredths of a percent, e.g. 1000 = 10%
  commission:      number;
  status:          string;
}

export interface ShopOrdersResult {
  orders:           ShopOrder[];
  next_page_token?: string;
  total_count?:     number;
}

export interface CreatorShopProfile {
  open_id:        string;
  username:       string;
  nickname:       string;
  avatar_url:     string;
  follower_count: number;
  bio:            string;
}

export interface WithdrawableBalance {
  amount:   number;
  currency: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a page of the creator's affiliate orders.
 * POST /affiliate_creator/202410/orders/search
 * Scope: affiliate.creator.order.read
 *
 * @param accessToken  tts_access_token cookie value
 * @param opts         pagination + date filter
 */
export async function searchCreatorOrders(
  accessToken: string,
  opts?: {
    pageSize?:    number;
    pageToken?:   string;
    createTimeGe?: number;
    createTimeLt?: number;
  },
): Promise<ShopOrdersResult> {
  if (!accessToken) return { orders: [] };

  const client = getClient();
  const { pageSize = 100, pageToken, createTimeGe, createTimeLt } = opts ?? {};

  const body = {
    ...(createTimeGe && { create_time_ge: createTimeGe }),
    ...(createTimeLt && { create_time_lt: createTimeLt }),
  };

  try {
    const res = await client.api.AffiliateCreatorV202410Api.OrdersSearchPost(
      pageSize,
      accessToken,
      'application/json',
      pageToken,
      body as Parameters<typeof client.api.AffiliateCreatorV202410Api.OrdersSearchPost>[4],
    );

    const data = (res.body as { data?: { orders?: unknown[]; next_page_token?: string; total_count?: number } }).data ?? {};
    const raw: unknown[] = Array.isArray(data.orders) ? data.orders : [];

    const orders: ShopOrder[] = raw.map((o: unknown) => {
      const item = o as Record<string, unknown>;
      return {
        order_id:        String(item.order_id        ?? ''),
        create_time:     Number(item.create_time     ?? 0),
        product_id:      String(item.product_id      ?? ''),
        product_name:    String(item.product_name    ?? ''),
        sku_id:          String(item.sku_id          ?? ''),
        quantity:        Number(item.quantity        ?? 0),
        sale_price:      Number(item.sale_price      ?? 0),
        currency:        String(item.currency        ?? 'USD'),
        commission_rate: Number(item.commission_rate ?? 0),
        commission:      Number(item.commission      ?? 0),
        status:          String(item.status          ?? ''),
      };
    });

    return { orders, next_page_token: data.next_page_token, total_count: data.total_count };
  } catch (err) {
    console.error('[TikTokShop] searchCreatorOrders error:', err);
    return { orders: [] };
  }
}

/**
 * Get the creator's own TikTok Shop profile.
 * GET /affiliate_creator/202508/profiles
 * Scope: affiliate.creator.profile.read
 *
 * @param accessToken  tts_access_token cookie value
 */
export async function getCreatorShopProfile(
  accessToken: string,
): Promise<CreatorShopProfile | null> {
  if (!accessToken) return null;

  const client = getClient();

  try {
    const res = await client.api.AffiliateCreatorV202508Api.ProfilesGet(
      accessToken,
      'application/json',
    );

    const u = ((res.body as { data?: Record<string, unknown> }).data ?? {}) as Record<string, unknown>;

    return {
      open_id:        String(u.open_id         ?? ''),
      username:       String(u.username        ?? ''),
      nickname:       String(u.nickname        ?? ''),
      avatar_url:     String(u.avatar_url      ?? ''),
      follower_count: Number(u.follower_count  ?? 0),
      bio:            String(u.bio_description ?? ''),
    };
  } catch (err) {
    console.error('[TikTokShop] getCreatorShopProfile error:', err);
    return null;
  }
}

/**
 * Get pending / withdrawable balance.
 * GET /finance/202507/orders/unsettled
 * Scope: finance.read
 *
 * @param accessToken  tts_access_token cookie value
 * @param shopCipher   tts_shop_cipher  cookie value (optional for creators)
 */
export async function getWithdrawableBalance(
  accessToken: string,
  shopCipher?: string,
): Promise<WithdrawableBalance | null> {
  if (!accessToken) return null;

  const client = getClient();

  try {
    const res = await client.api.FinanceV202507Api.OrdersUnsettledGet(
      'CREATE_TIME',
      accessToken,
      'application/json',
      undefined,
      100,
      'DESC',
      undefined,
      undefined,
      shopCipher || undefined,
    );

    const data = (res.body as { data?: Record<string, unknown> }).data ?? {};

    return {
      amount:   Number((data as Record<string, unknown>).unsettled_amount ?? 0),
      currency: String((data as Record<string, unknown>).currency          ?? 'USD'),
    };
  } catch (err) {
    console.error('[TikTokShop] getWithdrawableBalance error:', err);
    return null;
  }
}

/**
 * Get earnings statements.
 * GET /finance/202309/statements
 * Scope: finance.read
 *
 * @param accessToken  tts_access_token cookie value
 * @param shopCipher   tts_shop_cipher  cookie value (optional)
 * @param opts         pagination
 */
export async function getStatements(
  accessToken: string,
  shopCipher?: string,
  opts?: { pageSize?: number; pageToken?: string },
) {
  if (!accessToken) return { statements: [] };

  const client = getClient();
  const { pageSize = 20, pageToken } = opts ?? {};

  try {
    const res = await client.api.FinanceV202309Api.StatementsGet(
      'STATEMENT_TIME',
      accessToken,
      'application/json',
      undefined,
      undefined,
      pageSize,
      pageToken,
      'DESC',
      undefined,
      shopCipher || undefined,
    );

    const data = (res.body as { data?: Record<string, unknown> }).data ?? {};
    return {
      statements:      Array.isArray((data as Record<string, unknown>).statements)
        ? (data as Record<string, unknown>).statements
        : [],
      next_page_token: (data as Record<string, unknown>).next_page_token,
    };
  } catch (err) {
    console.error('[TikTokShop] getStatements error:', err);
    return { statements: [] };
  }
}

/**
 * Refresh an expired access token using the stored refresh token.
 * Call this from a background job or on 401 responses.
 *
 * @param refreshToken  tts_refresh_token cookie value
 */
export async function refreshShopToken(refreshToken: string): Promise<{
  access_token:    string;
  refresh_token:   string;
  expires_in:      number;
  refresh_expires: number;
} | null> {
  if (!refreshToken) return null;

  try {
    const { AccessTokenTool } = await import('@/lib/tiktokshop-sdk');
    const result = await AccessTokenTool.refreshToken(refreshToken, APP_KEY, APP_SECRET);
    const data   = result.body?.data;

    if (!data?.access_token) return null;

    const now = Math.floor(Date.now() / 1000);
    return {
      access_token:    data.access_token,
      refresh_token:   data.refresh_token ?? refreshToken,
      expires_in:      data.access_token_expire_in   ? data.access_token_expire_in   - now : 7 * 86400,
      refresh_expires: data.refresh_token_expire_in  ? data.refresh_token_expire_in  - now : 30 * 86400,
    };
  } catch (err) {
    console.error('[TikTokShop] refreshShopToken error:', err);
    return null;
  }
}
