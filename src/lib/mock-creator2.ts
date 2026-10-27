/**
 * Extra sample data for the creator's My data, Publish, Rewards and Account screens. Invented numbers that line up with
 * ANALYTICS / POSTS / MISSIONS in mock.ts. Nothing is saved or sent anywhere.
 */
import { ANALYTICS } from "./mock";

/* ---------------- My data ---------------- */

export type RangeKey = "7 days" | "30 days" | "90 days";
export const RANGES: RangeKey[] = ["7 days", "30 days", "90 days"];

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
  /** Change against the period before, percent (history, not a forecast). */
  gmvChange: number;
  ordersChange: number;
  /** Videos / LIVE / Showcase share of commission, percent. */
  channel: [number, number, number];
  byProduct: { productId: string; commission: number; orders: number }[];
  /** Commission of everything outside the top five products. */
  other: number;
  /** How many of the 12 weekly columns fall inside this range. */
  weeks: number;
  /** Second sentence of the AI summary, written from this range's numbers. */
  note: string;
};

export const RANGE_DATA: Record<RangeKey, RangeData> = {
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
    weeks: 1,
    note: "Your cancel rate went up to 11.2% this week, mostly toilet cleaner orders from the 10 Oct video.",
  },
  "30 days": {
    gmv: ANALYTICS.gmv, orders: ANALYTICS.orders, est: ANALYTICS.commissionEst, paid: ANALYTICS.commissionPaid, cancel: ANALYTICS.cancelRate,
    gmvChange: 18, ordersChange: 14,
    channel: [62, 25, 13],
    byProduct: ANALYTICS.byProduct.map((b) => ({ productId: b.productId, commission: b.commission, orders: b.orders })),
    other: 89.2,
    weeks: 4,
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
    weeks: 12,
    note: "Your weekly commission has tripled since August. The toilet cleaner and pillowcase bring the most cancellations.",
  },
};

/** ANALYTICS.weekly scaled to commission in RM, oldest first; the last four weeks add up to the 30-day estimate. */
export const WEEKLY_COMMISSION = ANALYTICS.weekly.map((v) => Math.round(v * 54.6));
export const WEEK_LABELS = ["10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep", "14 Sep", "21 Sep", "28 Sep", "5 Oct", "12 Oct", "19 Oct", "26 Oct"];

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

/** Orders in the 30 days before, for the "Sales dropping" tag. */
export const PREV_ORDERS: Record<string, number> = { p21: 171, p13: 132, p22: 88, p17: 61, p09: 66 };

export type PayoutMonth = { month: string; est: number; paid: number; pending: number; clawed: number; status: "Settling" | "Paid" };
export const PAYOUTS: PayoutMonth[] = [
  { month: "October 2026", est: 1840.2, paid: 1120.4, pending: 668.3, clawed: 51.5, status: "Settling" },
  { month: "September 2026", est: 1402.8, paid: 1348.1, pending: 0, clawed: 54.7, status: "Paid" },
  { month: "August 2026", est: 1066.5, paid: 1021.9, pending: 0, clawed: 44.6, status: "Paid" },
  { month: "July 2026", est: 812.3, paid: 790.0, pending: 0, clawed: 22.3, status: "Paid" },
  { month: "June 2026", est: 640.1, paid: 628.4, pending: 0, clawed: 11.7, status: "Paid" },
];

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
    gives: ["Silver TAP rates, higher than open plan", "AI picks for your niche", "Everything in Bronze"],
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
  "7-day streak": "Post every day for 7 days in a row. You're on day 6.",
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
