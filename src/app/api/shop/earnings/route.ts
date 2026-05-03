import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  searchCreatorOrders,
  getWithdrawableBalance,
  type ShopOrder,
} from '@/lib/tiktok-shop-service';

/**
 * GET /api/shop/earnings?days=30
 *
 * Returns aggregated earnings data for the Earnings page.
 * Requires tts_access_token cookie (set after TikTok Shop OAuth).
 *
 * Response:
 *   total_gmv      — total gross GMV for the period
 *   daily_gmv      — [{ date, gmv }] for the chart
 *   units_sold     — total units sold
 *   order_count    — total order count
 *   top_products   — top 10 products by GMV
 *   withdrawable   — Available to Withdraw amount
 *   currency       — currency code (e.g. "USD")
 *   period_days    — period queried
 *   connected      — false if TikTok Shop is not yet connected
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  // Must be logged in with TikTok (Open Platform)
  const tikTokToken = cookieStore.get('tiktok_token')?.value;
  if (!tikTokToken) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Must have connected TikTok Shop
  const shopToken  = cookieStore.get('tts_access_token')?.value ?? '';
  const shopCipher = cookieStore.get('tts_shop_cipher')?.value  ?? '';

  if (!shopToken) {
    return NextResponse.json({ connected: false, total_gmv: 0, daily_gmv: [], units_sold: 0,
      order_count: 0, top_products: [], withdrawable: 0, currency: 'USD', period_days: 0 });
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 30), 90);
  const now  = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;

  // ── Paginate orders (up to 500) ───────────────────────────────────────────
  const allOrders: ShopOrder[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 5; page++) {
    const result = await searchCreatorOrders(shopToken, {
      pageSize:     100,
      pageToken,
      createTimeGe: from,
      createTimeLt: now,
    });
    allOrders.push(...result.orders);
    if (!result.next_page_token) break;
    pageToken = result.next_page_token;
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  let total_gmv  = 0;
  let units_sold = 0;
  let currency   = 'USD';

  const dailyMap:   Record<string, number> = {};
  const productMap: Record<string, { name: string; gmv: number; units: number }> = {};

  for (const o of allOrders) {
    // sale_price is in smallest unit (cents) — convert to main unit
    const orderGmv = (o.sale_price * o.quantity) / 100;
    total_gmv  += orderGmv;
    units_sold += o.quantity;
    if (o.currency) currency = o.currency;

    const date = new Date(o.create_time * 1000).toISOString().slice(0, 10);
    dailyMap[date] = (dailyMap[date] ?? 0) + orderGmv;

    if (o.product_id) {
      const p = productMap[o.product_id] ?? { name: o.product_name, gmv: 0, units: 0 };
      p.gmv   += orderGmv;
      p.units += o.quantity;
      productMap[o.product_id] = p;
    }
  }

  // Fill daily_gmv array — one entry per day, gaps = 0
  const daily_gmv: { date: string; gmv: number }[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date((from + d * 86400) * 1000).toISOString().slice(0, 10);
    daily_gmv.push({ date, gmv: Math.round((dailyMap[date] ?? 0) * 100) / 100 });
  }

  // Top 10 products by GMV
  const top_products = Object.entries(productMap)
    .map(([id, p]) => ({ product_id: id, name: p.name, gmv: Math.round(p.gmv * 100) / 100, units: p.units }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 10);

  // Withdrawable balance
  const balance = await getWithdrawableBalance(shopToken, shopCipher || undefined);

  return NextResponse.json({
    connected:    true,
    total_gmv:    Math.round(total_gmv  * 100) / 100,
    units_sold,
    order_count:  allOrders.length,
    currency,
    daily_gmv,
    top_products,
    withdrawable: balance?.amount ?? 0,
    period_days:  days,
  });
}
