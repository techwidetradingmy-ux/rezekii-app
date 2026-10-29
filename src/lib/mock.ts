/**
 * Sample data for the Rezekii 2.0 preview. Product photos are the TAP products from V1's homepage; names, shops,
 * people and numbers are invented so the screens look real. Nothing here comes from or goes to TikTok.
 */

export type CreatorLevel = "Bronze" | "Silver" | "Gold";

export type Product = {
  id: string;
  name: string;
  shop: string;
  img: string;
  price: number;
  category: string;
  /** Commission open to every creator (TikTok's open plan), percent. */
  publicRate: number;
  /**
   * TAP commission the seller pays into Techwide's campaign, percent. Fixed when the seller registers; only the seller can raise
   * it (Change or End).
   */
  partnerRate: number;
  /**
   * Rezekii rate: what creators earn on Rezekii, percent (owner, 29 Oct 2026). From the open plan rate up to the TAP commission
   * −1%; Techwide keeps the rest. Admin can change it inside those limits.
   */
  tapRate: number;
  /**
   * Optional rate per level, e.g. open plan 8%, TAP commission 10%: Bronze 8%, Silver 9%, Gold 9%. Most products give every
   * level the same rate.
   */
  levelRates?: Partial<Record<CreatorLevel, number>>;
  sold: number;
  rating: number;
  samples: "open" | "advanced" | "designated" | null;
};

export const PRODUCTS: Product[] = [
  { id: "p01", name: "Slim-fit track pants (S–XXL)", shop: "Urban Basics MY", img: "/products/tap-01.jpg", price: 30.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 1119976, rating: 4.8, samples: "open" },
  { id: "p02", name: "Plain cotton tee, unisex", shop: "Urban Basics MY", img: "/products/tap-02.jpg", price: 16.9, category: "Fashion", publicRate: 5, partnerRate: 8, tapRate: 7, sold: 955078, rating: 4.7, samples: "open" },
  { id: "p03", name: "Hooded water-resistant windbreaker", shop: "Urban Basics MY", img: "/products/tap-03.jpg", price: 22.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 929468, rating: 4.7, samples: "advanced" },
  { id: "p04", name: "Women's casual wide pants", shop: "Urban Basics MY", img: "/products/tap-04.jpg", price: 23.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 750806, rating: 3.9, samples: "open" },
  { id: "p05", name: "High-waist yoga pants", shop: "Urban Basics MY", img: "/products/tap-05.jpg", price: 16.9, category: "Sports", publicRate: 5, partnerRate: 8, tapRate: 6, sold: 727638, rating: 4.8, samples: "advanced" },
  { id: "p06", name: "Scuba training pants", shop: "Urban Basics MY", img: "/products/tap-06.jpg", price: 24.9, category: "Sports", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 648901, rating: 4.5, samples: null },
  { id: "p07", name: "Microfiber polo shirt", shop: "Urban Basics MY", img: "/products/tap-07.jpg", price: 16.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 524819, rating: 4.6, samples: "open" },
  { id: "p08", name: "Granite non-stick casserole pot", shop: "Seri Living MY", img: "/products/tap-08.jpg", price: 159.9, category: "Home & Kitchen", publicRate: 9, partnerRate: 11, tapRate: 10, sold: 512430, rating: 4.9, samples: "designated" },
  { id: "p09", name: "Stretchable slim pants with zip", shop: "Mawar Wear", img: "/products/tap-09.jpg", price: 11.13, category: "Fashion", publicRate: 8, partnerRate: 10, tapRate: 9, levelRates: { Bronze: 8, Silver: 9, Gold: 9 }, sold: 496651, rating: 4.4, samples: "open" },
  { id: "p10", name: "Women's bootcut pants", shop: "Urban Basics MY", img: "/products/tap-10.jpg", price: 23.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 481274, rating: 4.7, samples: null },
  { id: "p11", name: "900ml spin chopper blender", shop: "Seri Living MY", img: "/products/tap-11.jpg", price: 9.9, category: "Home & Kitchen", publicRate: 4, partnerRate: 6, tapRate: 5, sold: 469228, rating: 4.6, samples: "open" },
  { id: "p12", name: "Long-sleeve cotton tee", shop: "Urban Basics MY", img: "/products/tap-12.jpg", price: 13.99, category: "Fashion", publicRate: 5, partnerRate: 8, tapRate: 7, sold: 468296, rating: 4.7, samples: "open" },
  { id: "p13", name: "4-in-1 USB-C charging cable", shop: "Volt Gadget", img: "/products/tap-13.jpg", price: 10, category: "Electronics", publicRate: 12, partnerRate: 20, tapRate: 19, sold: 447199, rating: 4.5, samples: "open" },
  { id: "p14", name: "Capsule spin chopper, free whisk", shop: "Dapur Pintar", img: "/products/tap-14.jpg", price: 24.89, category: "Home & Kitchen", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 441924, rating: 4.3, samples: "advanced" },
  { id: "p15", name: "Women's straight-cut pants", shop: "Urban Basics MY", img: "/products/tap-15.jpg", price: 23.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 429202, rating: 4.6, samples: null },
  { id: "p16", name: "Straight-leg casual pants", shop: "Urban Basics MY", img: "/products/tap-16.jpg", price: 24.9, category: "Fashion", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 416592, rating: 4.6, samples: "open" },
  { id: "p17", name: "AirySoft pillowcase", shop: "Lena Home", img: "/products/tap-17.jpg", price: 6.6, category: "Home & Living", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 416526, rating: 2.8, samples: "open" },
  { id: "p18", name: "Cordless vacuum with mop pad", shop: "Seri Living MY", img: "/products/tap-18.jpg", price: 29.89, category: "Home & Living", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 379286, rating: 4.4, samples: "designated" },
  { id: "p19", name: "Women's bootcut pants, tall", shop: "Urban Basics MY", img: "/products/tap-19.jpg", price: 21.9, category: "Fashion", publicRate: 5, partnerRate: 8, tapRate: 7, sold: 366964, rating: 3.7, samples: "open" },
  { id: "p20", name: "Muslimah microfibre jersey", shop: "Urban Basics MY", img: "/products/tap-20.jpg", price: 16.9, category: "Muslim Fashion", publicRate: 5, partnerRate: 8, tapRate: 7, sold: 361080, rating: 4.8, samples: "advanced" },
  { id: "p21", name: "1.2L 316 stainless thermos", shop: "Seri Living MY", img: "/products/tap-21.jpg", price: 22.9, category: "Home & Kitchen", publicRate: 6, partnerRate: 10, tapRate: 9, sold: 354613, rating: 4.7, samples: "open" },
  { id: "p22", name: "Scrub-free toilet bowl cleaner", shop: "Bersih Pro", img: "/products/tap-22.jpg", price: 15.9, category: "Household", publicRate: 10, partnerRate: 17, tapRate: 16, sold: 339049, rating: 2.9, samples: "open" },
  { id: "p23", name: "Merdeka 2026 decoration set", shop: "Festa Craft", img: "/products/tap-23.jpg", price: 6.34, category: "Party", publicRate: 12, partnerRate: 20, tapRate: 19, sold: 314642, rating: 3.6, samples: null },
  { id: "p24", name: "Leak-proof tumbler 900ml", shop: "Seri Living MY", img: "/products/tap-24.jpg", price: 54.9, category: "Home & Kitchen", publicRate: 8, partnerRate: 12, tapRate: 11, sold: 303256, rating: 4.8, samples: "designated" },
];

export const product = (id: string) => PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];

/** A rate admin gives one creator for one product (owner, 29 Oct 2026). She sees it as her special rate. */
export type CustomRate = { productId: string; handle: string; rate: number; until?: string };
export const CUSTOM_RATES: CustomRate[] = [{ productId: "p05", handle: "@aisyah.glow", rate: 7, until: "31 Dec" }];
/** What one creator earns on a product: her special rate, else her level's rate, else the product's Rezekii rate. */
export function rateFor(p: Product, who: { handle: string; level: CreatorLevel } = CREATOR): { rate: number; special: boolean; until?: string } {
  const c = CUSTOM_RATES.find((r) => r.productId === p.id && r.handle === who.handle);
  if (c) return { rate: c.rate, special: true, until: c.until };
  return { rate: p.levelRates?.[who.level] ?? p.tapRate, special: false };
}

/** RM 1,245.00 */
export const rm = (n: number, dp = 2) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
/** 1.1M, 955K */
export const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/* ---------------- Creator ---------------- */

export const CREATOR = {
  photo: "/avatars/aisyah.jpg",
  name: "Aisyah Rahman",
  first: "Aisyah",
  handle: "@aisyah.glow",
  email: "aisyah.glow@gmail.com",
  whatsapp: "+60 12-345 6789",
  initials: "AR",
  state: "Selangor",
  level: "Silver" as CreatorLevel,
  tiktokLevel: 4,
  activity: "Active" as "New" | "Active" | "Highly active",
  streak: 16,
  credits: 1250,
  showcaseSize: 1248,
  checkedThisMonth: 1248,
  activatedThisMonth: 6,
  tiktokShopLinked: true,
};

export type Raise = { id: string; productId: string; nowRate: number | null; tapRate: number; until: string; eligible: boolean };
/** Same listing in the creator's showcase, better through Techwide's TAP campaign. */
export const RAISES: Raise[] = [
  { id: "r1", productId: "p13", nowRate: 12, tapRate: 13, until: "30 Nov", eligible: true },
  { id: "r2", productId: "p22", nowRate: 10, tapRate: 15, until: "15 Dec", eligible: true },
  { id: "r3", productId: "p09", nowRate: 8, tapRate: 9, until: "31 Dec", eligible: true },
  { id: "r4", productId: "p01", nowRate: 6, tapRate: 7, until: "30 Nov", eligible: true },
  { id: "r5", productId: "p21", nowRate: null, tapRate: 9, until: "31 Jan", eligible: true },
  { id: "r6", productId: "p24", nowRate: 8, tapRate: 9, until: "31 Dec", eligible: false },
];
/** Similar products (different listing) in Techwide's TAP campaigns, added straight to the showcase. */
export const SIMILAR = ["p14", "p11", "p18", "p05"];

/**
 * AI picks on Home. `from: "tap"` = in a Techwide TAP campaign (TAP rate; free sample if the product has one);
 * `from: "tiktok"` = from TikTok Shop's best-seller lists in Malaysia (open-plan rate, no sample through us).
 * video / live = orders per 100 viewers in Malaysia, last 7 days. week = units sold in 7 days. rank = place in its category this week.
 */
export type AiPick = { productId: string; from: "tap" | "tiktok"; fit: "video" | "live"; match: number; why: string; video: number; live: number; week: number; rank?: number };
export const AI_PICKS: AiPick[] = [
  { productId: "p20", from: "tap", fit: "video", match: 96, why: "Muslim fashion sells 2.3× your average. Try-on videos convert best.", video: 3.4, live: 2.1, week: 18200, rank: 2 },
  { productId: "p13", from: "tap", fit: "video", match: 91, why: "Best rate in Electronics. A 15-second demo is enough.", video: 4.1, live: 2.6, week: 26400, rank: 1 },
  { productId: "p21", from: "tap", fit: "video", match: 89, why: "Home & Kitchen is your #2 category; your last thermos video sold 166.", video: 2.9, live: 2.2, week: 15800, rank: 6 },
  { productId: "p05", from: "tap", fit: "video", match: 87, why: "Fashion is 46% of your sales, and this sells best at your price range.", video: 3.1, live: 1.9, week: 21900, rank: 4 },
  { productId: "p10", from: "tiktok", fit: "video", match: 85, why: "Rising in Fashion, your top category, and inside your price range.", video: 2.7, live: 1.8, week: 24300, rank: 3 },
  { productId: "p02", from: "tap", fit: "video", match: 83, why: "Cheap basic that fits into outfit videos you already make.", video: 2.4, live: 1.6, week: 31200, rank: 1 },
  { productId: "p15", from: "tiktok", fit: "video", match: 79, why: "Top 5 in Fashion this week. Similar pants already sell for you.", video: 2.5, live: 1.7, week: 19800, rank: 5 },
  { productId: "p12", from: "tap", fit: "video", match: 78, why: "Long sleeves sell steadily in the rainy season.", video: 2.2, live: 1.5, week: 12400 },
  { productId: "p11", from: "tap", fit: "live", match: 88, why: "RM 9.90 add-on that sells fast as a LIVE flash deal.", video: 2.0, live: 6.3, week: 22100, rank: 4 },
  { productId: "p08", from: "tap", fit: "live", match: 86, why: "Buyers want to see it cook and ask questions before paying RM 159.", video: 1.2, live: 5.8, week: 6900, rank: 8 },
  { productId: "p14", from: "tap", fit: "live", match: 84, why: "Choppers sell on live demos; Home & Kitchen is your #2 category.", video: 1.9, live: 5.2, week: 11800, rank: 7 },
  { productId: "p18", from: "tap", fit: "live", match: 82, why: "Needs a demo. LIVE converts 3.5× better than video here.", video: 1.4, live: 4.9, week: 9100, rank: 3 },
  { productId: "p06", from: "tiktok", fit: "live", match: 81, why: "Buyers ask about sizes, which you can answer on LIVE.", video: 1.6, live: 4.4, week: 14300, rank: 2 },
  { productId: "p24", from: "tap", fit: "live", match: 80, why: "Bundle it with the thermos on LIVE for a bigger basket.", video: 1.5, live: 4.1, week: 8200 },
];
/** What the AI read from the creator's own data before matching. */
export const AI_PROFILE = {
  compared: 3482,
  categories: [["Fashion", 46], ["Home & Kitchen", 31], ["Muslim Fashion", 14]] as [string, number][],
  price: "RM 10–40",
  /** Average order value of her orders, last 30 days. */
  aov: 31.4,
  video: 72,
};

export type SampleStatus = "Applied" | "Approved" | "Shipped" | "Received" | "Posting" | "Done" | "Not approved";
export type MySample = { id: string; productId: string; status: SampleStatus; videos: number; due?: string; reason?: string; receivedAt?: string };
export const MY_SAMPLES: MySample[] = [
  { id: "s1", productId: "p21", status: "Posting", videos: 2, due: "2 Nov", receivedAt: "26 Oct" },
  { id: "s2", productId: "p11", status: "Shipped", videos: 0 },
  { id: "s3", productId: "p05", status: "Approved", videos: 0 },
  { id: "s4", productId: "p08", status: "Not approved", videos: 0, reason: "Designated samples go to Highly active creators (30 days in a row). You're on day 16." },
  { id: "s5", productId: "p02", status: "Done", videos: 3, receivedAt: "2 Oct" },
];

export const ANALYTICS = {
  range: "Last 30 days",
  updated: "Today 09:12",
  gmv: 18420.5,
  orders: 612,
  commissionEst: 1840.2,
  commissionPaid: 1120.4,
  cancelRate: 9.4,
  byChannel: [
    { label: "Videos", share: 62 },
    { label: "LIVE", share: 25 },
    { label: "Showcase", share: 13 },
  ],
  byProduct: [
    { productId: "p21", commission: 760.4, orders: 214, cancel: 4.1 },
    { productId: "p13", commission: 530.2, orders: 168, cancel: 6.0 },
    { productId: "p22", commission: 241.8, orders: 96, cancel: 17.7 },
    { productId: "p17", commission: 120.5, orders: 70, cancel: 21.4 },
    { productId: "p09", commission: 98.1, orders: 41, cancel: 4.9 },
  ],
  videos: [
    { id: "v1", title: "Thermos test: 24 hours of ice", date: "12 Oct", views: 182000, orders: 166, gmv: 3801.4, commission: 380.1, cancel: 3.0, productId: "p21" },
    { id: "v2", title: "Cleaner that works without scrubbing?", date: "10 Oct", views: 96000, orders: 88, gmv: 1399.2, commission: 237.9, cancel: 18.2, productId: "p22" },
    { id: "v3", title: "One cable for every phone", date: "8 Oct", views: 74000, orders: 120, gmv: 1200, commission: 240, cancel: 5.0, productId: "p13" },
    { id: "v4", title: "Pillowcase haul, 6 colours", date: "5 Oct", views: 41000, orders: 64, gmv: 422.4, commission: 42.2, cancel: 23.4, productId: "p17" },
    { id: "v5", title: "Office look under RM 30", date: "2 Oct", views: 38000, orders: 41, gmv: 456.3, commission: 54.8, cancel: 4.9, productId: "p09" },
  ],
  weekly: [3.2, 4.1, 3.6, 5.2, 4.8, 6.4, 7.1, 6.2, 7.8, 8.4, 7.9, 9.6],
};

export const SOCIALS = [
  { name: "TikTok", handle: "@aisyah.glow", linked: true, note: "Public posting pending TikTok's review; drafts work now" },
  { name: "Instagram", handle: "@aisyah.glow", linked: true, note: "Reels" },
  { name: "Facebook", handle: "Aisyah Glow", linked: true, note: "Page" },
  { name: "Threads", handle: "", linked: false, note: "" },
];

export const POSTS = [
  { id: "post1", caption: "Thermos test part 2: 48 hours", when: "Today 8:00 PM", targets: ["TikTok", "Instagram", "Facebook"], status: "Scheduled" },
  { id: "post2", caption: "3 cables I actually use", when: "Tomorrow 12:30 PM", targets: ["TikTok", "Instagram"], status: "Scheduled" },
  { id: "post3", caption: "Toilet cleaner, honest review", when: "Yesterday 9:10 PM", targets: ["TikTok", "Facebook", "Threads"], status: "Partly failed", failed: "Threads: account needs reconnecting" },
  { id: "post4", caption: "Office look under RM 30", when: "2 Oct 7:45 PM", targets: ["TikTok", "Instagram", "Facebook"], status: "Published" },
];

export type Mission = { id: string; title: string; reward: number; progress: number; goal: number; done?: boolean; due?: string; kind: "newbie" | "daily" | "milestone" };
export const MISSIONS: Mission[] = [
  { id: "m1", kind: "newbie", title: "Fill in your basic profile", reward: 50, progress: 1, goal: 1, done: true },
  { id: "m2", kind: "newbie", title: "Verify your WhatsApp number", reward: 30, progress: 0, goal: 1, due: "5 days 12 hours" },
  { id: "m3", kind: "newbie", title: "Link TikTok Shop", reward: 100, progress: 1, goal: 1, done: true },
  { id: "m4", kind: "newbie", title: "Link your TikTok account", reward: 50, progress: 1, goal: 1, done: true },
  { id: "m5", kind: "newbie", title: "Connect Facebook, Instagram or Threads", reward: 30, progress: 1, goal: 1, done: true },
  { id: "m6", kind: "newbie", title: "Run your first scan", reward: 50, progress: 0, goal: 1, due: "5 days 12 hours" },
  { id: "m7", kind: "daily", title: "Post today (with a Techwide product in the cart)", reward: 30, progress: 2, goal: 5 },
  { id: "m8", kind: "milestone", title: "Post 3 videos for a sample within 7 days", reward: 80, progress: 2, goal: 3 },
  { id: "m9", kind: "milestone", title: "First collaboration completed", reward: 120, progress: 0, goal: 1 },
];

export const BADGES = [
  { name: "First scan", got: true },
  { name: "Link master", got: true },
  { name: "7-day streak", got: true },
  { name: "Sample star", got: true },
  { name: "Highly active", got: false, honour: true },
  { name: "First RM 1,000", got: true },
  { name: "Silver", got: true },
  { name: "Gold", got: false },
];

/** Referral rewards (owner, 28 Oct 2026): win-win, the same for creators and sellers. Admin can change them. */
export const REFERRAL_REWARD = { inviter: 100, friend: 50 };

/**
 * People who signed up with her link or code. Successful (owner, 29 Oct 2026) = linked TikTok Shop (sellers: Seller Center) and
 * filled in their details. What each one earned her lives in her credit history, not here.
 */
export const INVITES = [
  { name: "@nurul.beauty", role: "Creator", linked: true, details: true, when: "3 Oct" },
  { name: "Seri Living MY", role: "Seller", linked: true, details: true, when: "11 Oct" },
  { name: "@farah.home", role: "Creator", linked: true, details: false, when: "20 Oct" },
  { name: "@hafiz.tech", role: "Creator", linked: true, details: true, when: "22 Oct" },
  { name: "@mira.new", role: "Creator", linked: false, details: false, when: "27 Oct" },
];

export const LEDGER = [
  { when: "Today 10:02", what: "Mission: Post today (tier 3)", amount: 20 },
  { when: "Today 09:40", what: "Cross-channel post · 3 channels", amount: -15 },
  { when: "Yesterday", what: "Refund: Instagram post failed", amount: 5 },
  { when: "Yesterday", what: "Referral: @hafiz.tech", amount: 100 },
  { when: "21 Oct", what: "AI script generation", amount: -12 },
  { when: "21 Oct", what: "Refund: generation failed", amount: 12 },
  { when: "18 Oct", what: "Mission: Link TikTok Shop", amount: 100 },
];

/* ---------------- Seller ---------------- */

export const SELLER = {
  shop: "Seri Living MY",
  contact: "Mei Ling Tan",
  country: "Malaysia",
  state: "Kuala Lumpur",
  products: ["p08", "p11", "p18", "p21", "p24"],
};

export const SELLER_RESULTS = {
  range: "Last 30 days",
  gmv: 86420.0,
  units: 2318,
  creators: 47,
  videos: 212,
  lives: 18,
  commissionPaid: 9840.6,
  daily: [1.8, 2.1, 2.4, 2.2, 2.9, 3.1, 2.8, 3.4, 3.9, 3.6, 4.2, 4.8, 4.4, 5.1],
  topCreators: [
    { handle: "@aisyah.glow", videos: 6, units: 380, gmv: 8702.0 },
    { handle: "@kak.ros.kitchen", videos: 9, units: 352, gmv: 8060.8 },
    { handle: "@mei.ling.deals", videos: 4, units: 211, gmv: 4831.9 },
    { handle: "@ahmad.fitlife", videos: 3, units: 98, gmv: 2244.2 },
  ],
};

/** 1 sample = at least 1 video by the due date; 3 videos earn the creator a bonus (owner, 29 Oct 2026). Only 0 videos past due is overdue. */
export const SAMPLE_DESTINATIONS = [
  { handle: "@aisyah.glow", productId: "p21", videos: 3, status: "3 videos posted", ok: true },
  { handle: "@kak.ros.kitchen", productId: "p08", videos: 3, status: "3 videos posted + 1 LIVE", ok: true },
  { handle: "@mei.ling.deals", productId: "p24", videos: 2, status: "2 videos posted", ok: true },
  { handle: "@zara.home", productId: "p18", videos: 0, status: "No video yet · 3 days late · reminded", ok: false },
];

/* ---------------- Admin ---------------- */

export const TAP_PIPELINE = [
  { col: "New", items: [{ id: "TAP-0418", shop: "Seri Living MY", what: "2 products · from QR · KL Expo", age: "1 h" }, { id: "TAP-0417", shop: "Volt Gadget", what: "5 products · Seller Center sync", age: "3 h" }] },
  { col: "In review", items: [{ id: "TAP-0412", shop: "Dapur Pintar", what: "6 products · Aina · 2 days over", age: "2 d", late: true }] },
  { col: "To submit", items: [{ id: "TAP-0409", shop: "Mawar Wear", what: "TikTok: 1 failed / 3", age: "1 d", fail: true }] },
  { col: "Waiting on TikTok", items: [{ id: "TAP-0401", shop: "Lena Home", what: "Submitted 3 days ago", age: "3 d" }, { id: "TAP-0399", shop: "Bersih Pro", what: "Commission change", age: "4 d" }] },
  { col: "Not approved", items: [{ id: "TAP-0395", shop: "Festa Craft", what: "0 samples (Seller Center)", age: "5 d" }] },
  { col: "Live", items: [{ id: "TAP-0380", shop: "Urban Basics MY", what: "Ends 31 Dec · auto-extend on", age: "—" }] },
];

export type Verdict = "Approve" | "Look" | "Reject";
export const SAMPLE_REVIEW = [
  { id: "SR-221", handle: "@mei.ling.deals", productId: "p24", pool: "Designated", verdict: "Approve" as Verdict, facts: "Highly active · 31 days in a row · delivered 3 / 3 samples (9 videos) · Silver · TikTok Lv.5 · Home matches", summary: "Always delivers on time and meets every condition for designated samples." },
  { id: "SR-222", handle: "@farah.home", productId: "p14", pool: "Advanced", verdict: "Look" as Verdict, facts: "Active · 11 days in a row · Bronze · last sample: no video yet, due in 2 days", summary: "No video yet for her last sample, but it isn't due." },
  { id: "SR-223", handle: "@mira.new", productId: "p08", pool: "Designated", verdict: "Reject" as Verdict, facts: "New · joined 4 days ago · no videos yet", summary: "Designated samples go to Highly active creators. Suggest 3 open samples instead." },
  { id: "SR-224", handle: "@hafiz.tech", productId: "p13", pool: "Open", verdict: "Approve" as Verdict, facts: "New · TikTok Shop linked · Electronics matches", summary: "Open samples are for everyone; category matches." },
  { id: "SR-225", handle: "@zara.home", productId: "p18", pool: "Designated", verdict: "Reject" as Verdict, facts: "Overdue sample: 3 days late on cordless vacuum", summary: "Has an overdue sample. Approve again after it's delivered." },
];

export const PEOPLE = [
  { handle: "@aisyah.glow", name: "Aisyah Rahman", state: "Selangor", level: "Silver", tt: 4, activity: "Active", streak: 16, gmv30: 18420, status: "Approved", mcn: false },
  { handle: "@kak.ros.kitchen", name: "Rosnah Ismail", state: "Johor", level: "Gold", tt: 6, activity: "Highly active", streak: 42, gmv30: 64210, status: "Approved", mcn: true },
  { handle: "@mei.ling.deals", name: "Tan Mei Ling", state: "Kuala Lumpur", level: "Silver", tt: 5, activity: "Highly active", streak: 31, gmv30: 22880, status: "Approved", mcn: false },
  { handle: "@farah.home", name: "Farah Aziz", state: "Penang", level: "Bronze", tt: 3, activity: "Active", streak: 11, gmv30: 3410, status: "Approved", mcn: false },
  { handle: "@mira.new", name: "Amira Zulkifli", state: "Perak", level: "Bronze", tt: 1, activity: "New", streak: 0, gmv30: 0, status: "Waiting", mcn: false },
  { handle: "@hafiz.tech", name: "Hafiz Roslan", state: "Selangor", level: "Bronze", tt: 2, activity: "New", streak: 2, gmv30: 420, status: "Waiting", mcn: false },
];
