/**
 * GET /api/tiktok/dashboard?range=Today|Yesterday|Past+7+Days|Past+30+Days|This+Month|Last+Month
 *
 * Central data hub for Home, Earnings, and Profile pages.
 * - GMV / earnings: TikTok Shop Partner API (requires TIKTOK_SHOP_* env vars)
 * - Top posts / video views: TikTok Login Kit API (uses tiktok_token cookie)
 * - All fields fall back to mock data when credentials are missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ── Shop API config ───────────────────────────────────────────────────────────
function shopConfigured() {
  return !!(
    process.env.TIKTOK_SHOP_APP_KEY &&
    process.env.TIKTOK_SHOP_APP_SECRET &&
    process.env.TIKTOK_SHOP_ACCESS_TOKEN &&
    process.env.TIKTOK_SHOP_ENABLED === 'true'
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const RANGES: Record<string, {
  totalGMV: number; prevGMV: number; deltaLabel: string;
  bars: number[]; labels: string[]; barDates: string[];
  productsSold: number; avgPrice: number;
  gmvPerVideo: number; gmvPerLive: number;
  videoViews: string; productTypes: number; withdraw: number;
}> = {
  'Today':         { totalGMV: 142,  prevGMV: 115,  deltaLabel: 'vs Yesterday',              bars: [142], labels: ['Today'], barDates: ['Today'],             productsSold: 8,  avgPrice: 17.75, gmvPerVideo: 48.30,  gmvPerLive: 112.50, videoViews: '2.4K',  productTypes: 3,  withdraw: 842 },
  'Yesterday':     { totalGMV: 115,  prevGMV: 107,  deltaLabel: 'vs Day Before',             bars: [115], labels: ['Yesterday'], barDates: ['Yesterday'],      productsSold: 6,  avgPrice: 19.23, gmvPerVideo: 38.50,  gmvPerLive: 98.20,  videoViews: '1.9K',  productTypes: 2,  withdraw: 842 },
  'Past 7 Days':   { totalGMV: 842,  prevGMV: 739,  deltaLabel: 'vs Previous 7 Days',       bars: [85,92,78,108,142,175,162], labels: ['M','T','W','T','F','S','S'], barDates: ['Apr 18','Apr 19','Apr 20','Apr 21','Apr 22','Apr 23','Apr 24'], productsSold: 42, avgPrice: 20.06, gmvPerVideo: 58.20,  gmvPerLive: 142.00, videoViews: '14.3K', productTypes: 5,  withdraw: 842 },
  'Past 30 Days':  { totalGMV: 3612, prevGMV: 2755, deltaLabel: 'vs Previous 30 Days',      bars: [38,52,45,68,72,58,85,92,78,64,88,96,72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212], labels: ['1','5','10','15','20','25','30'], barDates: Array.from({length:30},(_,i)=>`Apr ${i+1}`), productsSold: 86, avgPrice: 42.00, gmvPerVideo: 68.40, gmvPerLive: 215.00, videoViews: '247K',  productTypes: 12, withdraw: 842 },
  'This Month':    { totalGMV: 2480, prevGMV: 2100, deltaLabel: 'vs Same Window Last Month', bars: [72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212,198,225,242,268,255,288], labels: ['1','5','10','15','20','24'], barDates: Array.from({length:24},(_,i)=>`Apr ${i+1}`), productsSold: 58, avgPrice: 42.76, gmvPerVideo: 72.10, gmvPerLive: 245.00, videoViews: '168K',  productTypes: 9,  withdraw: 842 },
  'Last Month':    { totalGMV: 1012, prevGMV: 1054, deltaLabel: 'vs Month Prior',            bars: [22,38,42,35,48,52,45,68,58,72,65,82,78,88,92,95,88,78,85,92,82,75,68,72,78,82,88,92,75,82,78], labels: ['1','5','10','15','20','25','30'], barDates: Array.from({length:31},(_,i)=>`Mar ${i+1}`), productsSold: 32, avgPrice: 31.63, gmvPerVideo: 42.00, gmvPerLive: 128.00, videoViews: '98K',   productTypes: 7,  withdraw: 842 },
};

const MOCK_PRODUCTS = [
  { name: 'Glow Serum 30ml',   cat: 'Beauty', gmvRaw: 682,   units: 38, img: '/images/product-beauty.jpg' },
  { name: 'Matte Lip Tint',    cat: 'Beauty', gmvRaw: 425.6, units: 22, img: '/images/product-beauty.jpg' },
  { name: 'Nasi Lemak Sambal', cat: 'Food',   gmvRaw: 378,   units: 18, img: '/images/product-food.jpg' },
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

function fmt(n: number) {
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Fetch real top posts from TikTok Login Kit ────────────────────────────────
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
        duration: v.duration ? `0:${String(Math.round(v.duration)).padStart(2,'0')}` : '0:30',
        img:      v.cover_image_url || MOCK_POSTS[i]?.img || '',
        tag:      MOCK_POSTS[i]?.tag ?? 'Top Post',
        tagColor: MOCK_POSTS[i]?.tagColor ?? '#00c073',
        videoUrl: `https://www.tiktok.com/@_/video/${v.id}`,
      }));
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') || 'Past 30 Days';
  const cookieStore = await cookies();
  const token = cookieStore.get('tiktok_token')?.value;

  const mock = RANGES[range] ?? RANGES['Past 30 Days'];
  const delta = Math.round(((mock.totalGMV - mock.prevGMV) / mock.prevGMV) * 100);

  // Try real posts from TikTok Login Kit
  const livePosts = token ? await fetchLivePosts(token) : null;

  // ── When shopConfigured() is true, replace mock below with real Shop API calls:
  //
  // totalGMV, bars:       GET /api/affiliate/creator/earnings → sum by date range
  // productsSold, units:  GET /api/affiliate/orders/search    → filter by status=COMPLETED
  // topProducts:          GET /api/affiliate/products/performance → sort by GMV desc
  // niches:               Derived from topProducts category breakdown
  // gmvPerVideo/Live:     GET /api/affiliate/creator/performance
  // withdraw:             GET /api/finance/settlement/list    → available_for_withdrawal
  //
  // All endpoints need: app_key, access_token, shop_id, timestamp + HMAC-SHA256 sign
  // Docs: https://partner.tiktokshop.com/docv2/page/affiliate-seller-api-overview

  return NextResponse.json({
    range,
    dataSource: shopConfigured() ? 'live' : 'mock',

    // GMV summary
    total:      fmt(mock.totalGMV),
    totalRaw:   mock.totalGMV,
    prevTotal:  fmt(mock.prevGMV),
    delta,
    deltaLabel: mock.deltaLabel,

    // Bar chart
    bars:     mock.bars,
    labels:   mock.labels,
    barDates: mock.barDates,

    // Stats grid
    productsSold:  mock.productsSold,
    avgPrice:      fmt(mock.avgPrice),
    gmvPerVideo:   fmt(mock.gmvPerVideo),
    gmvPerLive:    fmt(mock.gmvPerLive),
    videoViews:    mock.videoViews,
    productTypes:  mock.productTypes,
    withdraw:      fmt(mock.withdraw),

    // Lists
    topProducts: MOCK_PRODUCTS.map(p => ({ ...p, gmv: fmt(p.gmvRaw) })),
    niches:      MOCK_NICHES.map(n => ({ ...n, gmv: fmt(n.gmvRaw) })),
    topPosts:    livePosts ?? MOCK_POSTS.map(p => ({ ...p, gmv: fmt(p.gmvRaw) })),
  });
}
