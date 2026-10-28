/**
 * Extra sample data for the creator's My data, Publish, Rewards and Account screens. Invented numbers that line up with
 * ANALYTICS / POSTS / MISSIONS in mock.ts. Nothing is saved or sent anywhere.
 */
import type { IconName } from "@/components/icons";
import { ANALYTICS } from "./mock";

/* ---------------- My data ---------------- */

export type RangeKey = "3 days" | "7 days" | "14 days" | "30 days" | "90 days" | "Lifetime";
export const RANGES: RangeKey[] = ["3 days", "7 days", "14 days", "30 days", "90 days", "Lifetime"];

/** Short names used in sentences and bars. */
export const SHORT: Record<string, string> = {
  p21: "Thermos",
  p13: "4-in-1 cable",
  p22: "Toilet cleaner",
  p17: "Pillowcase",
  p09: "Slim pants",
  p05: "Yoga pants",
};

export type RangeData = {
  gmv: number;
  orders: number;
  est: number;
  paid: number;
  cancel: number;
  /** Change against the period before, percent (history, not a forecast); null for Lifetime. */
  gmvChange: number | null;
  ordersChange: number | null;
  /** Videos / LIVE / Showcase share of commission, percent. */
  channel: [number, number, number];
  byProduct: { productId: string; commission: number; orders: number }[];
  /** Commission of everything outside the top five products. */
  other: number;
  /** Second sentence of the AI summary, written from this range's numbers. */
  note: string;
};

export const RANGE_DATA: Record<RangeKey, RangeData> = {
  "3 days": {
    gmv: 2010.6, orders: 66, est: 221.3, paid: 0, cancel: 12.4, gmvChange: 7, ordersChange: 4,
    channel: [55, 33, 12],
    byProduct: [
      { productId: "p21", commission: 88.2, orders: 25 },
      { productId: "p13", commission: 57.1, orders: 18 },
      { productId: "p22", commission: 36.0, orders: 13 },
      { productId: "p17", commission: 21.5, orders: 8 },
      { productId: "p09", commission: 9.8, orders: 3 },
    ],
    other: 8.7,
    note: "LIVE brought a third of your commission in the last 3 days, more than usual. Cancels are high: 12.4%.",
  },
  "7 days": {
    gmv: 4612.3, orders: 151, est: 512.4, paid: 86.4, cancel: 11.2, gmvChange: 9, ordersChange: 6,
    channel: [58, 30, 12],
    byProduct: [
      { productId: "p21", commission: 201.6, orders: 57 },
      { productId: "p13", commission: 128.9, orders: 41 },
      { productId: "p22", commission: 77.4, orders: 29 },
      { productId: "p17", commission: 44.8, orders: 17 },
      { productId: "p09", commission: 24.6, orders: 7 },
    ],
    other: 35.1,
    note: "Your cancel rate went up to 11.2% this week, mostly toilet cleaner orders from the 10 Oct video.",
  },
  "14 days": {
    gmv: 9120.4, orders: 298, est: 968.5, paid: 402.1, cancel: 10.6, gmvChange: 12, ordersChange: 9,
    channel: [60, 28, 12],
    byProduct: [
      { productId: "p21", commission: 389.5, orders: 108 },
      { productId: "p13", commission: 251.8, orders: 80 },
      { productId: "p22", commission: 140.2, orders: 52 },
      { productId: "p17", commission: 79.9, orders: 31 },
      { productId: "p09", commission: 47.3, orders: 14 },
    ],
    other: 59.8,
    note: "Commission is up 12% on the 2 weeks before. The pillowcase and toilet cleaner bring most of your cancels.",
  },
  "30 days": {
    gmv: ANALYTICS.gmv, orders: ANALYTICS.orders, est: ANALYTICS.commissionEst, paid: ANALYTICS.commissionPaid, cancel: ANALYTICS.cancelRate,
    gmvChange: 18, ordersChange: 14,
    channel: [62, 25, 13],
    byProduct: ANALYTICS.byProduct.map((b) => ({ productId: b.productId, commission: b.commission, orders: b.orders })),
    other: 89.2,
    note: "The toilet cleaner has many cancellations, mostly from the 10 Oct video.",
  },
  "90 days": {
    gmv: 41860, orders: 1402, est: 4310.6, paid: 3288.9, cancel: 8.1, gmvChange: 64, ordersChange: 51,
    channel: [66, 21, 13],
    byProduct: [
      { productId: "p21", commission: 1512.0, orders: 431 },
      { productId: "p13", commission: 1204.3, orders: 377 },
      { productId: "p22", commission: 602.5, orders: 238 },
      { productId: "p17", commission: 388.1, orders: 214 },
      { productId: "p09", commission: 301.9, orders: 126 },
    ],
    other: 301.8,
    note: "Your weekly commission has tripled since August. The toilet cleaner and pillowcase bring the most cancellations.",
  },
  Lifetime: {
    gmv: 68240.8, orders: 2310, est: 7020.4, paid: 5880.1, cancel: 7.6, gmvChange: null, ordersChange: null,
    channel: [64, 22, 14],
    byProduct: [
      { productId: "p21", commission: 2410.2, orders: 690 },
      { productId: "p13", commission: 1880.6, orders: 590 },
      { productId: "p22", commission: 905.3, orders: 360 },
      { productId: "p17", commission: 590.7, orders: 330 },
      { productId: "p09", commission: 488.2, orders: 205 },
    ],
    other: 745.4,
    note: "Since March your monthly commission has grown every month. Two products bring 61% of everything you've earned.",
  },
};

/** ANALYTICS.weekly scaled to commission in RM, oldest first; the last four weeks add up to the 30-day estimate. */
export const WEEKLY_COMMISSION = ANALYTICS.weekly.map((v) => Math.round(v * 58.02));
export const WEEK_LABELS = ["10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep", "14 Sep", "21 Sep", "28 Sep", "5 Oct", "12 Oct", "19 Oct", "26 Oct"];

/** Commission per day, 29 Sep to today (28 Oct), oldest first. The last 3, 7, 14 and 30 add up to those ranges. */
const DAILY = [
  48.2, 51.0, 49.5, 53.1, 50.4, 55.8, 52.6, 54.0, 57.3, 53.9, 56.2, 58.0, 55.1, 57.7, 59.4, 59.5,
  61.2, 66.8, 63.0, 70.4, 64.9, 62.3, 67.5, 69.5, 75.2, 71.0, 75.4, 70.1, 78.4, 72.8,
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (back: number) => {
  const d = new Date(Date.UTC(2026, 9, 28 - back));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const days = (n: number): Chart => ({ unit: "day", points: DAILY.slice(-n).map((v, i) => [dayLabel(n - 1 - i), v]) });

/** The commission chart for each range: per day up to 30 days, per week for 90 days, per month for lifetime. */
export type Chart = { unit: "day" | "week" | "month"; points: [string, number][] };
export const CHARTS: Record<RangeKey, Chart> = {
  "3 days": days(3),
  "7 days": days(7),
  "14 days": days(14),
  "30 days": days(30),
  "90 days": { unit: "week", points: WEEK_LABELS.map((l, i) => [l, WEEKLY_COMMISSION[i]]) },
  Lifetime: { unit: "month", points: [["Mar", 96.4], ["Apr", 268.0], ["May", 455.9], ["Jun", 612.3], ["Jul", 861.0], ["Aug", 1180.4], ["Sep", 1689.3], ["Oct", 1857.1]] },
};

/** Showcase products to avoid (last 30 days): buyer rating from TikTok's product data, cancels and returns from her own orders. */
export const WATCH = [
  { productId: "p17", cancel: 21.4, rating: 2.8, orders: 70, returned: 6 },
  { productId: "p22", cancel: 17.7, rating: 2.9, orders: 96, returned: 4 },
];

/** The action plan on My data: what to do next, each one written from a number above. */
export type Action = { id: string; tag: "Shoot today" | "Fix now" | "This week" | "Grow"; icon: IconName; title: string; short: string; why: string; cta: string; href?: string; remove?: string };
export const ACTIONS: Action[] = [
  { id: "a0", tag: "Shoot today", icon: "flame", title: "Film 2 more thermos videos today", short: "Film 2 thermos videos", why: "Your 12 Oct thermos video got 41.2K views in the last 24 hours, 5× your usual. The thermos is rated 4.7★ and sold 23 today.", cta: "Plan videos", href: "/app/publish" },
  { id: "a1", tag: "Fix now", icon: "alert", title: "Avoid promoting the AirySoft pillowcase", short: "Remove the pillowcase", why: "Rated 2.8★, and 21.4% of your orders for it were cancelled in 30 days. Low ratings and cancels can hurt your account.", cta: "Remove from showcase", remove: "p17" },
  { id: "a2", tag: "Fix now", icon: "star", title: "Check your showcase for low ratings", short: "Check low ratings", why: "2 products are under 3★ (danger zone) and 3 are under 4★. Keep posting; pick 4★ products for new videos.", cta: "Run risk check", href: "/app/data/risk" },
  { id: "a3", tag: "This week", icon: "cal", title: "Post 1 more thermos video by 2 Nov", short: "Post 1 thermos video", why: "Your free sample needs 3 of 3 videos. The thermos is also your top earner: 39% of your commission.", cta: "Submit video link", href: "/app/account#samples" },
  { id: "a4", tag: "This week", icon: "scan", title: "Add 4 products that pay more", short: "Add 4 better rates", why: "Products already in your showcase, paying +1% to +5% more through Techwide.", cta: "See scan results", href: "/app#scan" },
  { id: "a5", tag: "Grow", icon: "video", title: "Go LIVE with kitchen products", short: "Go LIVE with kitchen items", why: "Just 2 LIVE sessions a week bring about a quarter of your commission. Choppers and cookware sell 2.6× better on LIVE than on video.", cta: "See LIVE picks", href: "/app/data/ai-picks" },
  { id: "a6", tag: "Grow", icon: "send", title: "Post between 8 and 10 pm", short: "Post at 8–10 pm", why: "Your videos posted 8 to 10 pm got 1.8× the views of daytime posts in the last 30 days.", cta: "Schedule a post", href: "/app/publish" },
];

/** The creator's own videos taking off right now (views in the last 24 hours vs usual), for "Shoot today". week = daily views, oldest first. */
export const VIRAL = [
  { id: "v1", productId: "p21", title: "Thermos test: 24 hours of ice", views24: 41200, times: 5, ordersToday: 23, week: [2.1, 1.8, 2.4, 3.0, 5.6, 14.2, 41.2], ideas: ["Day 2: ice still there?", "Hot coffee test, 12 hours"] },
  { id: "v3", productId: "p13", title: "One cable for every phone", views24: 18600, times: 3, ordersToday: 11, week: [1.4, 1.2, 1.9, 2.2, 3.8, 7.5, 18.6], ideas: ["Car charging test", "4 phones, 1 cable"] },
  { id: "v5", productId: "p09", title: "Office look under RM 30", views24: 7400, times: 2, ordersToday: 6, week: [0.9, 1.1, 1.0, 1.6, 2.4, 3.9, 7.4], ideas: ["Office look part 2: 3 ways to style"] },
  { id: "v2", productId: "p22", title: "Cleaner that works without scrubbing?", views24: 12300, times: 2, ordersToday: 9, week: [3.1, 2.8, 3.3, 4.0, 6.2, 8.9, 12.3], ideas: [] },
];
/** New products to try today: marketplace products with a free sample she can get, rated 4★+, matched to her categories. */
export const TRY_TODAY = [
  { productId: "p20", why: "Muslim fashion sells 2.3× your average. A try-on video fits.", idea: "Try-on: 3 ways to style it for work" },
  { productId: "p11", why: "RM 9.90 add-on that sells fast on LIVE with your kitchen products.", idea: "Show it next to your best kitchen seller" },
  { productId: "p07", why: "Fashion is your top category, and polos sell all year.", idea: "Fit check: 3 sizes side by side" },
];

/** Average views per video by the time she posted it, last 30 days (from her own videos). */
export const POST_TIMES: [string, number][] = [["6–9 am", 52000], ["12–2 pm", 77000], ["5–7 pm", 103000], ["8–10 pm", 155000], ["After 11 pm", 60000]];

export type VideoRow = {
  id: string;
  title: string;
  date: string;
  views: number | null;
  orders: number;
  gmv: number;
  commission: number;
  cancel: number;
  productId: string;
  refunds: number;
};

/** The five videos in ANALYTICS plus one private video (no view count). */
export const VIDEOS: VideoRow[] = [
  ...ANALYTICS.videos.map((v) => ({ ...v, views: v.views as number | null, refunds: ({ v1: 3, v2: 6, v3: 4, v4: 7, v5: 1 } as Record<string, number>)[v.id] ?? 0 })),
  { id: "v6", title: "Yoga pants try-on, 3 sizes", date: "28 Sep", views: null, orders: 24, gmv: 405.6, commission: 32.4, cancel: 8.3, productId: "p05", refunds: 1 },
];

/**
 * Her LIVEs in the last 30 days (owner, 28 Oct 2026). TikTok tags each creator order with where it came from (video or LIVE)
 * and which one, so a LIVE is the group of orders that share one LIVE. The time is her first sale in it. TikTok doesn't give
 * creators viewers or watch time, so there are none here.
 */
export type LiveRow = { id: string; date: string; time: string; orders: number; gmv: number; commission: number; cancel: number; products: [string, number, number, number][] };
export const LIVES: LiveRow[] = [
  { id: "l1", date: "Tue 21 Oct", time: "8 PM", orders: 50, gmv: 1580, commission: 168.4, cancel: 6.2, products: [["p13", 110, 34, 5.9], ["p21", 58.4, 16, 6.9]] },
  { id: "l2", date: "Sat 18 Oct", time: "9 PM", orders: 41, gmv: 1210, commission: 132.6, cancel: 4.8, products: [["p21", 101.6, 28, 3.6], ["p09", 31, 13, 7.5]] },
  { id: "l3", date: "Wed 15 Oct", time: "8:30 PM", orders: 44, gmv: 780, commission: 88, cancel: 12.5, products: [["p17", 60, 35, 14.3], ["p13", 28, 9, 5.6]] },
  { id: "l4", date: "Sun 12 Oct", time: "9 PM", orders: 20, gmv: 640, commission: 71, cancel: 3.1, products: [["p13", 51, 16, 3.9], ["p21", 20, 4, 0]] },
];

/** Where a product's commission came from: her videos, her LIVEs, and the rest (showcase and other links). */
export function channelSplit(productId: string, commission: number) {
  const video = VIDEOS.filter((v) => v.productId === productId).reduce((a, v) => a + v.commission, 0);
  const live = LIVES.reduce((a, l) => a + l.products.filter(([id]) => id === productId).reduce((x, [, c]) => x + c, 0), 0);
  return { video, live, other: Math.max(0, commission - video - live) };
}

/** Orders in the 30 days before, for the "Sales dropping" tag. */
export const PREV_ORDERS: Record<string, number> = { p21: 171, p13: 132, p22: 88, p17: 61, p09: 66 };

/**
 * extra = commission above what TikTok's open plan pays on the same orders: every TAP order is traced, and its TAP rate is
 * compared with the open rate we recorded for that product when it was scanned. Estimated until TikTok settles the order.
 */
export type PayoutMonth = { month: string; est: number; paid: number; pending: number; clawed: number; extra: number; status: "Settling" | "Paid" };
export const PAYOUTS: PayoutMonth[] = [
  { month: "October 2026", est: 1840.2, paid: 1120.4, pending: 668.3, clawed: 51.5, extra: 318.6, status: "Settling" },
  { month: "September 2026", est: 1402.8, paid: 1348.1, pending: 0, clawed: 54.7, extra: 221.4, status: "Paid" },
  { month: "August 2026", est: 1066.5, paid: 1021.9, pending: 0, clawed: 44.6, extra: 152.3, status: "Paid" },
  { month: "July 2026", est: 812.3, paid: 790.0, pending: 0, clawed: 22.3, extra: 96.8, status: "Paid" },
  { month: "June 2026", est: 640.1, paid: 628.4, pending: 0, clawed: 11.7, extra: 41.2, status: "Paid" },
];

export type PayoutDay = { day: number; est: number; extra: number; clawed: number; state: "paid" | "pending" | "future" };
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Commission per day for one month (spread from the month's totals), with each day's payout state. Today is 28 Oct. */
export function payoutDays(m: PayoutMonth): { year: number; month: number; days: PayoutDay[] } {
  const [name, y] = m.month.split(" ");
  const month = FULL_MONTHS.indexOf(name);
  const year = Number(y);
  const n = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const now = year === 2026 && month === 9;
  const upto = now ? 28 : n;
  const w = Array.from({ length: upto }, (_, i) => 0.7 + (((i * 37 + month * 11) % 23) / 23) * 0.6 + (i / upto) * 0.35);
  const sum = w.reduce((a, b) => a + b, 0);
  const clawDays = [Math.round(upto * 0.3), Math.round(upto * 0.62)];
  const days = Array.from({ length: n }, (_, i): PayoutDay => {
    if (i >= upto) return { day: i + 1, est: 0, extra: 0, clawed: 0, state: "future" };
    return {
      day: i + 1,
      est: round2((m.est * w[i]) / sum),
      extra: round2((m.extra * w[i]) / sum),
      clawed: clawDays.includes(i) ? round2(m.clawed / 2) : 0,
      // Roughly the last 10 days are still inside the return window.
      state: now && i >= 17 ? "pending" : "paid",
    };
  });
  // Put the rounding left-over on the last day, so the days add up to the month exactly.
  const lastDay = days[upto - 1];
  lastDay.est = round2(lastDay.est + m.est - days.reduce((t, d) => t + d.est, 0));
  lastDay.extra = round2(lastDay.extra + m.extra - days.reduce((t, d) => t + d.extra, 0));
  return { year, month, days };
}

/* ---------------- Publish ---------------- */

export type Platform = "TikTok" | "Instagram" | "Facebook" | "Threads";
export const PLATFORMS: Platform[] = ["TikTok", "Instagram", "Facebook", "Threads"];
export const CAPTION_MAX: Record<Platform, number> = { TikTok: 2200, Instagram: 2200, Facebook: 5000, Threads: 500 };

export type TargetStatus = "Published" | "Scheduled" | "Failed" | "In TikTok drafts";
export type CalPost = {
  id: string;
  /** ISO date (Malaysia time). */
  date: string;
  time: string;
  caption: string;
  productId: string;
  targets: { name: Platform; status: TargetStatus; reason?: string; fix?: "Retry" | "Reconnect" }[];
};

/** Today in the preview is Wednesday 28 October 2026. */
export const TODAY = "2026-10-28";

export const CALENDAR: CalPost[] = [
  { id: "c1", date: "2026-10-20", time: "8:30 PM", caption: "Thermos vs a cheap flask", productId: "p21", targets: [{ name: "TikTok", status: "Published" }, { name: "Instagram", status: "Published" }, { name: "Facebook", status: "Published" }] },
  { id: "c2", date: "2026-10-22", time: "9:00 PM", caption: "One cable, four phones", productId: "p13", targets: [{ name: "TikTok", status: "Published" }, { name: "Instagram", status: "Published" }] },
  { id: "c3", date: "2026-10-24", time: "1:00 PM", caption: "Pillowcase colours ranked", productId: "p17", targets: [{ name: "TikTok", status: "Published" }, { name: "Facebook", status: "Published" }] },
  {
    id: "c4", date: "2026-10-26", time: "8:15 PM", caption: "Yoga pants fit check", productId: "p05",
    targets: [{ name: "TikTok", status: "Published" }, { name: "Instagram", status: "Failed", reason: "Video is 95 s; Reels allow up to 90 s", fix: "Retry" }, { name: "Facebook", status: "Published" }],
  },
  {
    id: "post3", date: "2026-10-27", time: "9:10 PM", caption: "Toilet cleaner, honest review", productId: "p22",
    targets: [{ name: "TikTok", status: "Published" }, { name: "Facebook", status: "Published" }, { name: "Threads", status: "Failed", reason: "Account needs reconnecting", fix: "Reconnect" }],
  },
  { id: "post1", date: "2026-10-28", time: "8:00 PM", caption: "Thermos test part 2: 48 hours", productId: "p21", targets: [{ name: "TikTok", status: "Scheduled" }, { name: "Instagram", status: "Scheduled" }, { name: "Facebook", status: "Scheduled" }] },
  { id: "post2", date: "2026-10-29", time: "12:30 PM", caption: "3 cables I actually use", productId: "p13", targets: [{ name: "TikTok", status: "Scheduled" }, { name: "Instagram", status: "Scheduled" }] },
  { id: "c8", date: "2026-10-30", time: "9:00 PM", caption: "Office look part 2", productId: "p09", targets: [{ name: "TikTok", status: "Scheduled" }, { name: "Instagram", status: "Scheduled" }, { name: "Facebook", status: "Scheduled" }] },
  { id: "c9", date: "2026-11-01", time: "11:00 AM", caption: "Weekend picnic with the thermos", productId: "p21", targets: [{ name: "TikTok", status: "Scheduled" }, { name: "Facebook", status: "Scheduled" }] },
  { id: "c10", date: "2026-11-03", time: "8:00 PM", caption: "Windbreaker in real rain", productId: "p03", targets: [{ name: "TikTok", status: "Scheduled" }, { name: "Instagram", status: "Scheduled" }] },
];

/* ---------------- Rewards ---------------- */

export const LEVELS = [
  {
    name: "Bronze", how: "TikTok Shop Lv.0–3",
    gives: ["Open-plan rates through Techwide", "Open samples", "Scan your showcase for better rates"],
  },
  {
    name: "Silver", how: "TikTok Shop Lv.4+, or RM 10,000 sales last month",
    gives: ["Silver Rezekii rates, higher than open plan", "Advanced samples once you're Active", "Everything in Bronze"],
  },
  {
    name: "Gold", how: "Techwide MCN creators, after 6 months",
    gives: ["Higher commission on selected products", "TikTok Shop support line for violations and frozen accounts", "Event invites, sample priority, paid content jobs"],
  },
] as const;

export const TIERS = [
  { name: "New", how: "Linked TikTok Shop", samples: "Open samples" },
  { name: "Active", how: "Post every day, 10 days in a row", samples: "Open + advanced samples" },
  { name: "Highly active", how: "30 days in a row + 100% sample delivery", samples: "All samples, including designated" },
] as const;

export const BADGE_INFO: Record<string, string> = {
  "First scan": "Ran your first showcase scan.",
  "Link master": "Linked TikTok Shop, your TikTok account and one more platform.",
  "7-day streak": "Post every day for 7 days in a row.",
  "Sample star": "Posted all 3 videos for a sample on time.",
  "Highly active": "30 days in a row and every sample delivered. The rarest badge on Rezekii.",
  "First RM 1,000": "Earned your first RM 1,000 of commission through TikTok Shop.",
  Silver: "Reached Silver: TikTok Shop Lv.4 or RM 10,000 sales in a month.",
  Gold: "Join Techwide's MCN and stay 6 months.",
};

/* ---------------- Account ---------------- */

export const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak",
  "Selangor", "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

export const NICHES = [
  "Beauty & Personal Care", "Womenswear", "Muslim Fashion", "Menswear", "Home Supplies", "Kitchenware", "Phones & Electronics",
  "Sports & Outdoor", "Health", "Food & Beverages", "Baby & Maternity", "Fashion Accessories", "Household Appliances", "Pet Supplies",
];

export const NOTIFY = [
  { key: "samples", label: "Samples", note: "Approved, shipped, video due" },
  { key: "chances", label: "Commission chances", note: "Better rates found in your showcase" },
  { key: "posts", label: "Publishing", note: "Posted, scheduled, failed" },
  { key: "rewards", label: "Missions & rewards", note: "Chests, streaks, referrals" },
] as const;
