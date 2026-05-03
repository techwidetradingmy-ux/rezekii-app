/**
 * GET /api/tiktok/dashboard?range=Today|Yesterday|Past+7+Days|Past+30+Days|This+Month|Last+Month
 *
 * Data priority:
 *  1. TikTok Shop Partner API (when tts_token + tts_cipher cookies exist)
 *  2. Static mock data (always available as fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  searchCreatorOrders,
  getAvailableBalance,
  getCreatorPerf,
} from '@/lib/tiktok-shop';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: Record<string, {
  totalGMV: number; prevGMV: number; deltaLabel: string;
  bars: number[]; labels: string[]; barDates: string[];
  productsSold: number; avgPrice: number;
  gmvPerVideo: number; gmvPerLive: number;
  videoViews: string; productTypes: number; withdraw: number;
}> = {
  'Today':        { totalGMV: 142,  prevGMV: 115,  deltaLabel: 'vs Yesterday',              bars: [142], labels: ['Today'], barDates: ['Today'],             productsSold: 8,  avgPrice: 17.75, gmvPerVideo: 48.30,  gmvPerLive: 112.50, videoViews: '2.4K',  productTypes: 3,  withdraw: 842 },
  'Yesterday':    { totalGMV: 115,  prevGMV: 107,  deltaLabel: 'vs Day Before',             bars: [115], labels: ['Yesterday'], barDates: ['Yesterday'],      productsSold: 6,  avgPrice: 19.23, gmvPerVideo: 38.50,  gmvPerLive: 98.20,  videoViews: '1.9K',  productTypes: 2,  withdraw: 842 },
  'Past 7 Days':  { totalGMV: 842,  prevGMV: 739,  deltaLabel: 'vs Previous 7 Days',       bars: [85,92,78,108,142,175,162], labels: ['M','T','W','T','F','S','S'], barDates: ['Apr 25','Apr 26','Apr 27','Apr 28','Apr 29','Apr 30','May 1'], productsSold: 42, avgPrice: 20.06, gmvPerVideo: 58.20,  gmvPerLive: 142.00, videoViews: '14.3K', productTypes: 5,  withdraw: 842 },
  'Past 30 Days': { totalGMV: 3612, prevGMV: 2755, deltaLabel: 'vs Previous 30 Days',      bars: [38,52,45,68,72,58,85,92,78,64,88,96,72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212], labels: ['1','5','10','15','20','25','30'], barDates: Array.from({length:30},(_,i)=>`Apr ${i+1}`), productsSold: 86, avgPrice: 42.00, gmvPerVideo: 68.40, gmvPerLive: 215.00, videoViews: '247K',  productTypes: 12, withdraw: 842 },
  'This Month':   { totalGMV: 2480, prevGMV: 2100, deltaLabel: 'vs Same Window Last Month', bars: [72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212,198,225,242,268,255,288], labels: ['1','5','10','15','20','24'], barDates: Array.from({length:24},(_,i)=>`May ${i+1}`), productsSold: 58, avgPrice: 42.76, gmvPerVideo: 72.10, gmvPerLive: 245.00, videoViews: '168K',  productTypes: 9,  withdraw: 842 },
  'Last Month':   { totalGMV: 1012, prevGMV: 1054, deltaLabel: 'vs Month Prior',            bars: [22,38,42,35,48,52,45,68,58,72,65,82,78,88,92,95,88,78,85,92,82,75,68,72,78,82,88,92,75,82,78], labels: ['1','5','10','15','20','25','30'], barDates: Array.from({length:31},(_,i)=>`Apr ${i+1}`), productsSold: 32, avgPrice: 31.63, gmvPerVideo: 42.00, gmvPerLive: 128.00, videoViews: '98K',   productTypes: 7,  withdraw: 842 },
};

const MOCK_PRODUCTS = [
  { name: 'Glow Serum 30ml',   cat: 'Beauty', gmvRaw: 682,   units: 38, img: '/images/product-beauty.jpg' },
  { name: 'Matte Lip Tint',    cat: 'Beauty', gmvRaw: 425.6, units: 22, img: '/images/product-beauty.jpg' },
  { name: 'Nasi Lemak Sambal', cat: 'Food',   gmvRaw: 378,   units: 18, img: '/images/product-food.jpg'   },
];
const MOCK_NICHES = [
  { name: 'Beauty',  pct: 48, gmvRaw: 1733.76, color: '#e8005a' },
  { name: 'Food',    pct: 22, gmvRaw: 794.64,  color: '#f5a623' },
  { name: 'Fashion', pct: 18, gmvRaw: 650.16,  color: '#8b5cf6' },
  { name: 'Tech',    pct: 12, gmvRaw: 433.44,  color: '#25f4ee' },
];
const MOCK_POSTS = [
  { caption: 'Glow Serum review . ASMR unboxing', views: '10.2K', gmvRaw: 142, duration: '0:28', img: '/images/product-beauty.jpg',  tag: 'Highest Earning', tagColor: '#f5a623' },
  { caption: 'Batik Tote OOTD haul',               views: '8.8K',  gmvRaw: 96,  duration: '0:42', img: '/images/product-fashion.jpg', tag: 'Best Selling',    tagColor: '#00c073' },
  { caption: 'AudioMY ProBuds blind test',          views: '6.4K',  gmvRaw: 72,  duration: '0:35', img: '/images/product-tech.jpg',    tag: 'Newly Viral',     tagColor: '#e8005a' },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── TikTok video list (Login Kit) ─────────────────────────────────────────────

async function fetchLivePosts(token: string) {
  try {
    const fields = 'id,title,video_description,view_count,cover_image_url,duration';
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const videos: Array<{
      id: string; title: string; video_description: string;
      view_count: number; cover_image_url: string; duration: number;
    }> = data?.data?.videos ?? [];
    if (!videos.length) return null;
    return videos
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 3)
      .map((v, i) => ({
        caption:  v.title || v.video_description?.slice(0, 50) || 'TikTok video',
        views:    fmtK(v.view_count ?? 0),
        gmv:      fmt(MOCK_POSTS[i]?.gmvRaw ?? 0),
        duration: v.duration ? `0:${String(Math.round(v.duration)).padStart(2, '0')}` : '0:30',
        img:      v.cover_image_url || MOCK_POSTS[i]?.img || '',
        tag:      MOCK_POSTS[i]?.tag    ?? 'Top Post',
        tagColor: MOCK_POSTS[i]?.tagColor ?? '#00c073',
        videoUrl: `https://www.tiktok.com/@_/video/${v.id}`,
      }));
  } catch {
    return null;
  }
}

// ── Convert daily GMV map → bar chart arrays ──────────────────────────────────

function buildBars(
  dailyGMV: Record<string, number>,
  range: string,
): { bars: number[]; labels: string[]; barDates: string[] } {
  const mock = MOCK[range] ?? MOCK['Past 30 Days'];
  if (!Object.keys(dailyGMV).length) {
    return { bars: mock.bars, labels: mock.labels, barDates: mock.barDates };
  }

  const sorted = Object.entries(dailyGMV).sort(([a], [b]) => a.localeCompare(b));
  const bars     = sorted.map(([, v]) => Math.round(v));
  const barDates = sorted.map(([d]) => {
    const dt = new Date(d);
    return `${dt.toLocaleString('en-MY', { month: 'short' })} ${dt.getDate()}`;
  });
  const dayLabels = ['S','M','T','W','T','F','S'];
  const labels = barDates.length <= 7
    ? sorted.map(([d]) => dayLabels[new Date(d).getDay()])
    : barDates.filter((_, i) => i % Math.ceil(barDates.length / 6) === 0);

  return { bars, labels, barDates };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const range       = req.nextUrl.searchParams.get('range') || 'Past 30 Days';
  const cookieStore = await cookies();

  const tiktokToken = cookieStore.get('tiktok_token')?.value;   // TikTok Login Kit
  const shopToken   = cookieStore.get('tts_token')?.value;       // TikTok Shop
  const shopCipher  = cookieStore.get('tts_cipher')?.value;      // TikTok Shop cipher

  const mock  = MOCK[range] ?? MOCK['Past 30 Days'];
  const delta = Math.round(((mock.totalGMV - mock.prevGMV) / mock.prevGMV) * 100);

  // ── Real data fetches (parallel) ────────────────────────────────────────────
  const [livePosts, shopOrders] = await Promise.all([
    tiktokToken ? fetchLivePosts(tiktokToken) : Promise.resolve(null),
    (shopToken && shopCipher)
      ? searchCreatorOrders(shopToken, shopCipher, range)
      : Promise.resolve(null),
  ]);

  // Creator performance (video/live GMV split + niche breakdown)
  let creatorPerf: Awaited<ReturnType<typeof getCreatorPerf>> = null;
  if (shopToken && shopCipher) {
    const raw = cookieStore.get('tiktok_user')?.value;
    const openId = raw ? (JSON.parse(decodeURIComponent(raw))?.open_id ?? '') : '';
    if (openId) {
      creatorPerf = await getCreatorPerf(shopToken, shopCipher, openId).catch(() => null);
    }
  }

  // Finance: available to withdraw
  let withdraw = mock.withdraw;
  if (shopToken && shopCipher) {
    const bal = await getAvailableBalance(shopToken, shopCipher).catch(() => 0);
    if (bal > 0) withdraw = bal;
  }

  // ── Build response ──────────────────────────────────────────────────────────

  const usingLiveShop = !!shopOrders;
  const totalGMV      = usingLiveShop ? shopOrders!.totalGMV : mock.totalGMV;
  const prevGMV       = mock.prevGMV;
  const liveGMVSplit  = creatorPerf ?? null;

  const { bars, labels, barDates } = usingLiveShop
    ? buildBars(shopOrders!.dailyGMV, range)
    : { bars: mock.bars, labels: mock.labels, barDates: mock.barDates };

  const liveProducts = usingLiveShop
    ? shopOrders!.topProducts.map((p, i) => ({
        name:   p.name,
        cat:    'TikTok Shop',
        gmv:    fmt(p.gmv),
        units:  p.units,
        img:    MOCK_PRODUCTS[i]?.img ?? '/images/product-beauty.jpg',
      }))
    : null;

  const catColors = ['#e8005a', '#f5a623', '#8b5cf6', '#25f4ee', '#00c073'];
  const liveNiches = liveGMVSplit?.categoryGMV?.length
    ? liveGMVSplit.categoryGMV.map((c, i) => ({
        name:  c.name,
        pct:   c.pct,
        gmv:   fmt(c.gmv),
        color: catColors[i % catColors.length],
      }))
    : null;

  return NextResponse.json({
    range,
    dataSource: usingLiveShop ? 'live' : 'mock',

    total:      fmt(totalGMV),
    totalRaw:   totalGMV,
    prevTotal:  fmt(prevGMV),
    delta:      usingLiveShop
      ? Math.round(((totalGMV - prevGMV) / (prevGMV || 1)) * 100)
      : delta,
    deltaLabel: mock.deltaLabel,

    bars,
    labels,
    barDates,

    productsSold:  usingLiveShop ? shopOrders!.productsSold : mock.productsSold,
    avgPrice:      usingLiveShop && shopOrders!.productsSold > 0
      ? fmt(shopOrders!.totalGMV / shopOrders!.productsSold)
      : fmt(mock.avgPrice),
    gmvPerVideo:   liveGMVSplit ? fmt(liveGMVSplit.videoGMV) : fmt(usingLiveShop ? shopOrders!.videoGMV : mock.gmvPerVideo),
    gmvPerLive:    liveGMVSplit ? fmt(liveGMVSplit.liveGMV)  : fmt(usingLiveShop ? shopOrders!.liveGMV  : mock.gmvPerLive),
    videoViews:    liveGMVSplit ? fmtK(liveGMVSplit.avgVideoPlays) : mock.videoViews,
    productTypes:  usingLiveShop ? shopOrders!.productTypes : mock.productTypes,
    withdraw:      fmt(withdraw),

    topProducts: liveProducts ?? MOCK_PRODUCTS.map(p => ({ ...p, gmv: fmt(p.gmvRaw) })),
    niches:      liveNiches   ?? MOCK_NICHES.map(n => ({ ...n, gmv: fmt(n.gmvRaw) })),
    topPosts:    livePosts    ?? MOCK_POSTS.map(p => ({ ...p, gmv: fmt(p.gmvRaw) })),
  });
}
