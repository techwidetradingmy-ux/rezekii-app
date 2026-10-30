/**
 * Extra sample data for the Seller site and Seller app (Seri Living MY). Builds on mock.ts; every shop, person and
 * number here is invented. Size variants reuse the shop's own product photos, as real listings often do.
 */
import { PRODUCTS, SELLER, SELLER_RESULTS, product, type Product } from "./mock";

export const TODAY = "28 Oct";
export const UPDATED = "today 09:12";

/* ---------------- Shop products ---------------- */

/** Where a product is in Techwide's TAP pipeline. */
export type Stage = "Not submitted" | "Submitted" | "Under review" | "Submitted to TikTok" | "Live" | "Not approved";

export type ShopItem = {
  id: string;
  name: string;
  img: string;
  price: number;
  category: string;
  /** TikTok's open-plan rate, percent. null = TikTok didn't tell us. */
  publicRate: number | null;
  sold: number;
  stage: Stage;
  /** Commission through TAP (percent), once submitted. */
  tapRate?: number;
  samples?: number;
  samplesLeft?: number;
  fromSellerCenter?: boolean;
  reason?: string;
  /** Dates for each pipeline step reached. */
  dates?: Partial<Record<Exclude<Stage, "Not submitted" | "Not approved">, string>>;
  note?: string;
  /** A real product from the seller's shop (owner, 30 Oct 2026): it has no sample product page. */
  real?: boolean;
  /** TikTok's listing: ACTIVATE = buyers can see it; PENDING = TikTok is still reviewing it, so it can't join TAP yet. */
  listing?: "ACTIVATE" | "PENDING";
  /** No API gives this product's sales, so no sales line is shown. */
  salesUnknown?: boolean;
  /** Second-level category, for creator conditions. */
  sub?: string;
};

const fromMock = (id: string, extra: Omit<ShopItem, "id" | "name" | "img" | "price" | "category" | "publicRate" | "sold">): ShopItem => {
  const p: Product = product(id);
  return { id, name: p.name, img: p.img, price: p.price, category: p.category, publicRate: p.publicRate, sold: p.sold, ...extra };
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "x01", name: "Granite casserole pot, 20cm", img: "/products/tap-08.jpg", price: 119.9, category: "Home & Kitchen", publicRate: 4, sold: 41380, stage: "Not submitted" },
  { id: "x02", name: "1.8L 316 stainless thermos", img: "/products/tap-21.jpg", price: 32.9, category: "Home & Kitchen", publicRate: 6, sold: 0, stage: "Not submitted", note: "New listing · 3 Oct" },
  { id: "x03", name: "Leak-proof tumbler 600ml, kids", img: "/products/tap-24.jpg", price: 39.9, category: "Home & Kitchen", publicRate: null, sold: 860, stage: "Not submitted" },
  { id: "x06", name: "Vacuum spare mop pads, 6 pcs", img: "/products/tap-18.jpg", price: 12.9, category: "Home & Living", publicRate: 6, sold: 2140, stage: "Not approved", fromSellerCenter: true, tapRate: 10, samples: 0, reason: "0 samples per SKU. Registered in Seller Center without samples, so creators can't apply.", dates: { Submitted: "22 Oct", "Under review": "23 Oct" } },
  { id: "x04", name: "Spin chopper 1.5L, 2 blades", img: "/products/tap-11.jpg", price: 15.9, category: "Home & Kitchen", publicRate: 5, sold: 2310, stage: "Under review", tapRate: 13, samples: 40, dates: { Submitted: "Today 10:12", "Under review": "Today 10:40" } },
  { id: "x05", name: "Cordless vacuum, pet hair edition", img: "/products/tap-18.jpg", price: 39.9, category: "Home & Living", publicRate: 6, sold: 120, stage: "Submitted to TikTok", tapRate: 16, samples: 40, dates: { Submitted: "24 Oct", "Under review": "24 Oct", "Submitted to TikTok": "25 Oct" } },
  fromMock("p21", { stage: "Live", tapRate: 10, samples: 40, samplesLeft: 6, dates: { Submitted: "9 Sep", "Under review": "9 Sep", "Submitted to TikTok": "10 Sep", Live: "12 Sep" } }),
  fromMock("p24", { stage: "Live", tapRate: 12, samples: 50, samplesLeft: 19, dates: { Submitted: "2 Oct", "Under review": "2 Oct", "Submitted to TikTok": "3 Oct", Live: "6 Oct" }, note: "First try on 29 Sep wasn't approved: commission was only +1% above the public rate. Fixed and resubmitted on 2 Oct." }),
  fromMock("p08", { stage: "Live", tapRate: 10, samples: 30, samplesLeft: 4, fromSellerCenter: true, dates: { Submitted: "14 Sep", "Under review": "15 Sep", "Submitted to TikTok": "15 Sep", Live: "17 Sep" } }),
  fromMock("p18", { stage: "Live", tapRate: 10, samples: 40, samplesLeft: 11, dates: { Submitted: "20 Sep", "Under review": "20 Sep", "Submitted to TikTok": "21 Sep", Live: "23 Sep" } }),
  fromMock("p11", { stage: "Live", tapRate: 6, samples: 30, samplesLeft: 9, dates: { Submitted: "20 Sep", "Under review": "21 Sep", "Submitted to TikTok": "21 Sep", Live: "24 Sep" } }),
];

export const shopItem = (id: string) => SHOP_ITEMS.find((s) => s.id === id) ?? SHOP_ITEMS[0];

/** The four statuses shown on Shop products. */
export const listStatus = (s: Stage): "Not submitted" | "Under review" | "Live" | "Not approved" =>
  s === "Live" ? "Live" : s === "Not approved" ? "Not approved" : s === "Not submitted" ? "Not submitted" : "Under review";

/** How hot a product is, and the raise above the public rate the AI suggests for it (blueprint W11). */
export function heat(sold: number): { label: string; raise: number; why: string } {
  if (sold === 0) return { label: "New listing", raise: 10, why: "it's a new listing with no sales yet, so creators need a bigger reason to try it" };
  if (sold < 10000) return { label: `Early sales · ${sold.toLocaleString("en-MY")} sold`, raise: 8, why: `it has early sales (${sold.toLocaleString("en-MY")} sold), and a little more helps it take off` };
  return { label: `Best-seller · ${Math.round(sold / 1000)}K sold`, raise: 5, why: `it already sells well (${Math.round(sold / 1000)}K sold), so creators say yes easily` };
}

/* ---------------- Results ---------------- */

export const RANGES = ["7 days", "30 days", "90 days"] as const;
export type Range = (typeof RANGES)[number];

export const RESULTS: Record<Range, { gmv: number; units: number; creators: number; videos: number; lives: number; paid: number; daily: number[]; labels: string[]; unit: string; prev: number }> = {
  "7 days": {
    gmv: 27310.6, units: 731, creators: 31, videos: 64, lives: 6, paid: 3112.4, prev: 18,
    daily: [3.3, 3.9, 4.2, 3.9, 4.1, 4.5, 3.4], labels: ["22", "23", "24", "25", "26", "27", "28"], unit: "Daily sales, RM thousands",
  },
  "30 days": {
    gmv: SELLER_RESULTS.gmv, units: SELLER_RESULTS.units, creators: SELLER_RESULTS.creators, videos: SELLER_RESULTS.videos, lives: SELLER_RESULTS.lives, paid: SELLER_RESULTS.commissionPaid, prev: 31,
    daily: [1.4, 1.7, 1.6, 1.9, 2.1, 1.9, 1.8, 2.2, 2.6, 2.7, 2.5, 2.7, 3.0, 2.8, 2.4, 2.7, 3.1, 3.4, 3.2, 2.9, 3.4, 3.7, 3.5, 3.3, 3.9, 4.2, 3.9, 4.1, 4.5, 3.4],
    labels: ["29 Sep", "", "", "", "", "", "5 Oct", "", "", "", "", "", "", "12 Oct", "", "", "", "", "", "", "19 Oct", "", "", "", "", "", "", "26 Oct", "", ""],
    unit: "Daily sales, RM thousands",
  },
  "90 days": {
    gmv: 198640.0, units: 5410, creators: 63, videos: 488, lives: 41, paid: 22590.8, prev: 0,
    daily: [6.2, 7.8, 9.1, 11.4, 12.9, 14.2, 15.8, 16.1, 17.9, 18.8, 20.4, 22.9, 24.2], labels: ["W1", "", "W3", "", "W5", "", "W7", "", "W9", "", "W11", "", "W13"], unit: "Weekly sales, RM thousands",
  },
};

export const TOP_CREATORS = [
  ...SELLER_RESULTS.topCreators.map((c, i) => ({ ...c, lives: [1, 3, 0, 1][i], level: ["Silver", "Gold", "Silver", "Bronze"][i] })),
  { handle: "@nurul.beauty", videos: 3, units: 87, gmv: 1992.3, lives: 0, level: "Silver" },
  { handle: "@dapur.wani", videos: 3, units: 74, gmv: 1694.6, lives: 2, level: "Bronze" },
];

export const BY_PRODUCT = [
  { id: "p08", units: 178, gmv: 28456.4, creators: 9, videos: 27 },
  { id: "p21", units: 951, gmv: 21777.9, creators: 21, videos: 74 },
  { id: "p24", units: 368, gmv: 20203.2, creators: 12, videos: 41 },
  { id: "p18", units: 393, gmv: 11746.8, creators: 8, videos: 38 },
  { id: "p11", units: 428, gmv: 4235.7, creators: 11, videos: 32 },
];

/* ---------------- Where samples went ---------------- */

export type Dest = { id: string; handle: string; item: string; videos: number; live: boolean; state: "Delivered" | "On time" | "Overdue"; due?: string; late?: number; reminded?: string; activity: string; sentOn: string };
export const DESTINATIONS: Dest[] = [
  { id: "d01", handle: "@aisyah.glow", item: "p21", videos: 3, live: false, state: "Delivered", activity: "Active", sentOn: "14 Sep" },
  { id: "d02", handle: "@kak.ros.kitchen", item: "p08", videos: 3, live: true, state: "Delivered", activity: "Highly active", sentOn: "18 Sep" },
  { id: "d03", handle: "@mei.ling.deals", item: "p24", videos: 2, live: false, state: "Delivered", activity: "Highly active", sentOn: "20 Oct" },
  { id: "d04", handle: "@zara.home", item: "p18", videos: 0, live: false, state: "Overdue", late: 3, reminded: "Reminded 26 Oct and 27 Oct", activity: "Active", sentOn: "11 Oct" },
  { id: "d05", handle: "@dapur.wani", item: "p11", videos: 3, live: true, state: "Delivered", activity: "Active", sentOn: "26 Sep" },
  { id: "d06", handle: "@nurul.beauty", item: "p21", videos: 3, live: false, state: "Delivered", activity: "Highly active", sentOn: "29 Sep" },
  { id: "d07", handle: "@ahmad.fitlife", item: "p24", videos: 3, live: true, state: "Delivered", activity: "Active", sentOn: "8 Oct" },
  { id: "d08", handle: "@farah.home", item: "p08", videos: 0, live: false, state: "On time", due: "3 Nov", activity: "Active", sentOn: "24 Oct" },
  { id: "d09", handle: "@hana.masak", item: "p11", videos: 1, live: false, state: "Delivered", activity: "Active", sentOn: "21 Oct" },
  { id: "d10", handle: "@iqbal.gadget", item: "p18", videos: 0, live: false, state: "Overdue", late: 1, reminded: "Reminded today", activity: "New", sentOn: "17 Oct" },
  { id: "d11", handle: "@sofia.rumah", item: "p21", videos: 3, live: false, state: "Delivered", activity: "Active", sentOn: "2 Oct" },
  { id: "d12", handle: "@kak.ros.kitchen", item: "p24", videos: 3, live: true, state: "Delivered", activity: "Highly active", sentOn: "9 Oct" },
];
/** Delivered = at least 1 video posted. On time = no video yet, not due. Overdue = no video by the due date. */
export const SAMPLE_SUMMARY = { sent: 48, delivered: 34, onTime: 9, overdue: 5, videos: 118, lives: 14 };

/* ---------------- Change requests ---------------- */

export type ReqStatus = "Sent" | "In progress" | "Done" | "Not possible";
export type ChangeReq = { id: string; kind: "Raise commission" | "Add samples" | "End early"; item: string; detail: string; when: string; status: ReqStatus; note?: string };
export const CHANGE_REQUESTS: ChangeReq[] = [
  { id: "REQ-1048", kind: "Add samples", item: "p21", detail: "+30 samples per SKU", when: "26 Oct", status: "In progress", note: "Aina is adding them in Partner Center" },
  { id: "REQ-1031", kind: "Raise commission", item: "p24", detail: "12% → 14%", when: "19 Oct", status: "Done", note: "TikTok approved on 22 Oct" },
  { id: "REQ-1017", kind: "End early", item: "p11", detail: "End on 30 Sep", when: "12 Sep", status: "Not possible", note: "Withdrawn by you after we explained 9 creators still had samples to post" },
  { id: "REQ-1009", kind: "Raise commission", item: "p21", detail: "8% → 10%", when: "1 Sep", status: "Done", note: "TikTok approved on 4 Sep" },
];

/* ---------------- AI competitors ---------------- */

export const COMP_CATEGORIES = ["Home & Kitchen", "Home & Living"] as const;
export type CompCategory = (typeof COMP_CATEGORIES)[number];
export const PERIODS = ["1 day", "7 days", "30 days"] as const;
export type Period = (typeof PERIODS)[number];

type Ranked = { name: string; shop: string; img: string; sold: string; gmv: string; trend: number; yours?: boolean };
export const COMP_PRODUCTS: Record<CompCategory, Ranked[]> = {
  "Home & Kitchen": [
    { name: "Capsule spin chopper, free whisk", shop: "Dapur Pintar", img: "/products/tap-14.jpg", sold: "25K–50K", gmv: "RM 500K–1M", trend: 22 },
    { name: "1.2L 316 stainless thermos", shop: "Seri Living MY", img: "/products/tap-21.jpg", sold: "10K–25K", gmv: "RM 250K–500K", trend: 18, yours: true },
    { name: "Leak-proof tumbler 900ml", shop: "Seri Living MY", img: "/products/tap-24.jpg", sold: "5K–10K", gmv: "RM 250K–500K", trend: 9, yours: true },
    { name: "Granite non-stick casserole pot", shop: "Seri Living MY", img: "/products/tap-08.jpg", sold: "1K–5K", gmv: "RM 250K–500K", trend: -4, yours: true },
    { name: "900ml spin chopper blender", shop: "Seri Living MY", img: "/products/tap-11.jpg", sold: "5K–10K", gmv: "RM 50K–100K", trend: 3, yours: true },
  ],
  "Home & Living": [
    { name: "AirySoft pillowcase", shop: "Lena Home", img: "/products/tap-17.jpg", sold: "25K–50K", gmv: "RM 100K–250K", trend: 14 },
    { name: "Scrub-free toilet bowl cleaner", shop: "Bersih Pro", img: "/products/tap-22.jpg", sold: "10K–25K", gmv: "RM 100K–250K", trend: 31 },
    { name: "Cordless vacuum with mop pad", shop: "Seri Living MY", img: "/products/tap-18.jpg", sold: "5K–10K", gmv: "RM 100K–250K", trend: 6, yours: true },
    { name: "Merdeka 2026 decoration set", shop: "Festa Craft", img: "/products/tap-23.jpg", sold: "5K–10K", gmv: "RM 10K–50K", trend: -38 },
  ],
};
export const COMP_VIDEOS: Record<CompCategory, { title: string; handle: string; img: string; views: string; sold: string }[]> = {
  "Home & Kitchen": [
    { title: "Chop 1 kg onions in 30 seconds", handle: "@dapur.wani", img: "/products/tap-14.jpg", views: "1.2M", sold: "2.5K–5K" },
    { title: "Ice still there after 24 hours", handle: "@aisyah.glow", img: "/products/tap-21.jpg", views: "820K", sold: "1K–2.5K" },
    { title: "Rendang in a granite pot, no sticking", handle: "@kak.ros.kitchen", img: "/products/tap-08.jpg", views: "640K", sold: "500–1K" },
  ],
  "Home & Living": [
    { title: "No-scrub toilet, honest 7-day test", handle: "@sofia.rumah", img: "/products/tap-22.jpg", views: "1.6M", sold: "5K–10K" },
    { title: "Pillowcase swap that fixed my hair", handle: "@nurul.beauty", img: "/products/tap-17.jpg", views: "930K", sold: "2.5K–5K" },
    { title: "Pet hair gone in one pass?", handle: "@zara.home", img: "/products/tap-18.jpg", views: "410K", sold: "500–1K" },
  ],
};
export const COMP_CREATORS: Record<CompCategory, { handle: string; followers: string; sold: string; videos: number; note: string }[]> = {
  "Home & Kitchen": [
    { handle: "@dapur.wani", followers: "100K–500K", sold: "10K–25K", videos: 42, note: "Cooking demos, Johor" },
    { handle: "@kak.ros.kitchen", followers: "500K–1M", sold: "10K–25K", videos: 38, note: "Already sells for you" },
    { handle: "@chef.amir.my", followers: "100K–500K", sold: "5K–10K", videos: 27, note: "LIVE every night 9 PM" },
    { handle: "@hana.masak", followers: "50K–100K", sold: "1K–5K", videos: 19, note: "Already sells for you" },
  ],
  "Home & Living": [
    { handle: "@sofia.rumah", followers: "100K–500K", sold: "10K–25K", videos: 51, note: "Cleaning hacks, KL" },
    { handle: "@kemas.dengan.lia", followers: "50K–100K", sold: "5K–10K", videos: 33, note: "Home organising" },
    { handle: "@zara.home", followers: "10K–50K", sold: "1K–5K", videos: 12, note: "Already sells for you" },
  ],
};
export const COMP_AI: Record<CompCategory, string> = {
  "Home & Kitchen": "Choppers and thermos bottles lead Home & Kitchen this week. 3 of the top 10 cost under RM 25, and the winning videos are short kitchen tests. Your 1.2L thermos is #2 and climbing; your casserole pot is slipping, so a LIVE demo could help.",
  "Home & Living": "Cleaning products are rising fast (+31% for the toilet cleaner). Your cordless vacuum is #3; the top videos show a before-and-after in one shot. Festive decor is falling after Merdeka.",
};

/* ---------------- Publish ---------------- */

export type Platform = "Facebook" | "Instagram" | "Threads";
export const SELLER_SOCIALS: { name: Platform; handle: string; linked: boolean }[] = [
  { name: "Facebook", handle: "Seri Living MY (Page)", linked: true },
  { name: "Instagram", handle: "@seriliving.my", linked: true },
  { name: "Threads", handle: "", linked: false },
];
export type SellerPost = { id: string; caption: string; day: number; time: string; when: string; img: string; results: { p: Platform; s: "Scheduled" | "Published" | "Failed"; why?: string }[] };
/** day: 0 = Monday 26 Oct, this week (today, Wednesday 28 Oct, is 2). Negative = last week. */
export const SELLER_POSTS: SellerPost[] = [
  { id: "sp1", caption: "Thermos test: hot kopi at 7 AM, still hot at 3 PM", day: 2, time: "8:00 PM", when: "Today 8:00 PM", img: "/products/tap-21.jpg", results: [{ p: "Facebook", s: "Scheduled" }, { p: "Instagram", s: "Scheduled" }] },
  { id: "sp2", caption: "Weekend rendang in the granite pot", day: 4, time: "12:30 PM", when: "Fri 12:30 PM", img: "/products/tap-08.jpg", results: [{ p: "Facebook", s: "Scheduled" }, { p: "Instagram", s: "Scheduled" }] },
  { id: "sp3", caption: "Tumbler colours for school, 6 to pick", day: 6, time: "9:00 AM", when: "Sun 9:00 AM", img: "/products/tap-24.jpg", results: [{ p: "Instagram", s: "Scheduled" }] },
  { id: "sp4", caption: "Chopper vs knife: 1 kg onions", day: 1, time: "8:00 PM", when: "Yesterday 8:00 PM", img: "/products/tap-11.jpg", results: [{ p: "Facebook", s: "Published" }, { p: "Instagram", s: "Published" }, { p: "Threads", s: "Failed", why: "Threads isn't connected any more. Connect it and retry." }] },
  { id: "sp5", caption: "Cordless vacuum: pet hair in one pass", day: -2, time: "7:45 PM", when: "24 Oct 7:45 PM", img: "/products/tap-18.jpg", results: [{ p: "Facebook", s: "Published" }, { p: "Instagram", s: "Published" }] },
  { id: "sp6", caption: "Open house set: pot + thermos", day: -5, time: "8:00 PM", when: "21 Oct 8:00 PM", img: "/products/tap-08.jpg", results: [{ p: "Facebook", s: "Published" }] },
];

/* ---------------- Rewards ---------------- */

export type SellerMission = { id: string; title: string; reward: number; kind: "newbie" | "milestone"; progress: number; goal: number; done?: boolean; claimed?: boolean; href?: string };
export const SELLER_MISSIONS: SellerMission[] = [
  { id: "sm1", kind: "newbie", title: "Connect Seller Center", reward: 100, progress: 1, goal: 1, done: true, claimed: true },
  { id: "sm2", kind: "newbie", title: "Add your contact name and phone", reward: 50, progress: 1, goal: 1, done: true, claimed: true },
  { id: "sm3", kind: "newbie", title: "Submit your first products", reward: 100, progress: 1, goal: 1, done: true, claimed: true },
  { id: "sm4", kind: "newbie", title: "Get your first product live", reward: 150, progress: 1, goal: 1, done: true, claimed: false },
  { id: "sm5", kind: "newbie", title: "Connect your Facebook Page, Instagram or Threads", reward: 30, progress: 1, goal: 1, done: true, claimed: false },
  { id: "sm6", kind: "newbie", title: "Invite one seller or creator", reward: 50, progress: 0, goal: 1, href: "/seller/app/rewards/referral" },
  { id: "sm7", kind: "milestone", title: "Have 10 products in TAP", reward: 200, progress: 8, goal: 10, href: "/seller/app/submit" },
  { id: "sm8", kind: "milestone", title: "50 creators selling your products", reward: 300, progress: 47, goal: 50, href: "/seller/app/results" },
  { id: "sm9", kind: "milestone", title: "No overdue samples for 30 days", reward: 150, progress: 12, goal: 30, href: "/seller/app/results/samples" },
];
/** Newbie missions end 7 days after sign-up; this is what's left. */
export const NEWBIE_LEFT_MS = ((5 * 24 + 12) * 60 + 4) * 60 * 1000;

export const SELLER_INVITES = [
  { name: "Rumah Rapi MY", role: "Seller", status: "Successful", note: "Connected shop and submitted 3 products", when: "4 Oct", credits: 50 },
  { name: "Kedai Ummi", role: "Seller", status: "Successful", note: "Connected shop and submitted 2 products", when: "11 Oct", credits: 50 },
  { name: "Bayu Sports Gear", role: "Seller", status: "Successful", note: "Connected shop and submitted 1 product", when: "19 Oct", credits: 50 },
  { name: "Teh Tarik Co.", role: "Seller", status: "Signed up", note: "Hasn't connected Seller Center yet · 23 days left", when: "22 Oct", credits: 0 },
  { name: "Lembut Baby Co.", role: "Seller", status: "Signed up", note: "Hasn't connected Seller Center yet · 26 days left", when: "26 Oct", credits: 0 },
];

export const SELLER_LEDGER = [
  { when: "Today 09:10", what: "Cross-channel post · 4 channels", amount: -20 },
  { when: "Today 08:15", what: "Referral: Bayu Sports Gear", amount: 50 },
  { when: "19 Oct", what: "Mission: Submit your first products", amount: 100 },
  { when: "11 Oct", what: "Referral: Kedai Ummi", amount: 50 },
  { when: "4 Oct", what: "Referral: Rumah Rapi MY", amount: 50 },
  { when: "13 Sep", what: "Mission: Add your contact name and phone", amount: 50 },
  { when: "12 Sep", what: "Mission: Connect Seller Center", amount: 100 },
];
export const SELLER_CREDITS = SELLER_LEDGER.reduce((a, l) => a + l.amount, 0);

/* ---------------- Notifications ---------------- */

export const SELLER_NOTES = [
  { id: "n1", icon: "check" as const, title: "Spin chopper 1.5L passed our review", line: "It's being added to the TAP campaign. Next: TikTok's check.", when: "Today 10:40", unread: true, href: "/seller/app/progress" },
  { id: "n2", icon: "video" as const, title: "@kak.ros.kitchen went LIVE with your casserole pot", line: "38 units sold during the LIVE.", when: "Today 09:05", unread: true, href: "/seller/app/results" },
  { id: "n3", icon: "alert" as const, title: "@zara.home is 3 days late on a sample", line: "No video yet. We've reminded them twice. Their sample access is paused until they post.", when: "Yesterday", unread: true, href: "/seller/app/results/samples" },
  { id: "n4", icon: "x" as const, title: "Vacuum spare mop pads wasn't approved", line: "It has 0 samples per SKU. Add samples and we'll resubmit it.", when: "23 Oct", unread: false, href: "/seller/app/progress" },
  { id: "n5", icon: "chart" as const, title: "Your week: RM 25,840 from 30 creators", line: "Up 18% on the week before.", when: "21 Oct", unread: false, href: "/seller/app/results" },
  { id: "n6", icon: "gift" as const, title: "+50 credits: Bayu Sports Gear joined with your link", line: "They connected their shop and submitted a product.", when: "19 Oct", unread: false, href: "/seller/app/rewards/wallet" },
];

/* ---------------- Landing ---------------- */

export const AGENCY = { gmv: 2850000, orders: 84224, campaigns: 126, products: 1940, month: "Aug 2026" };

export const TESTIMONIALS = [
  { shop: "Rumah Rapi MY", who: "Aida, owner", what: "Home storage", initials: "RR", stat: "Every sample gets a video", quote: "We used to post samples to anyone who asked and maybe one in four ever made a video. Now every sample comes back with a video, most with two or three, and I can see who's late before I even ask." },
  { shop: "Bayu Sports Gear", who: "Kelvin, founder", what: "Sports", initials: "BS", stat: "31 creators in 6 weeks", quote: "I was about to hire someone just to message creators. Instead I submitted 4 products on a Sunday night. Six weeks later 31 creators have sold for us and I haven't sent a single DM." },
  { shop: "Lembut Baby Co.", who: "Siti, marketing", what: "Mum & baby", initials: "LB", stat: "RM 0 before the first sale", quote: "What sold me was paying nothing until something sells. The samples are our cost, which is fair, and the dashboard shows exactly where each one went." },
];

export const SELLER_FAQ: [string, string][] = [
  ["Is it really free?", "There's no monthly fee and no sign-up fee. Techwide earns a partner commission from TikTok only when a creator in our TAP campaign sells your product. The samples you send are your own marketing cost, the same as today."],
  ["Who decides which creators get my samples?", "Techwide's team. We look at each creator's activity, delivery record, category, TikTok level and sales, and pick the ones most likely to bring results. The creator conditions you set are a reference. Ask our support team if you want to know why someone was picked."],
  ["What does 1 sample = 1 video mean?", "Every creator who gets your sample must post at least 1 video with your product in the cart by the due date. Most Rezekii creators post more than 1, and creators who post 3 earn an extra bonus. You can see each video on Where samples went. Creators with no video by the due date are reminded, then frozen or banned from samples."],
  ["How do I set the commission?", "You pick how much above your public commission you want to pay through TAP, at least +2%. Our AI suggests an amount based on how well each product already sells. You can always type your own."],
  ["Do I need a TikTok Shop?", "Yes. Rezekii is for Malaysian TikTok Shop sellers. Connecting Seller Center is the first step; it lets us read your products so you never type them in, and it keeps the platform for real sellers."],
  ["Is my shop data safe?", "Yes. Connecting Seller Center lets us read your products and orders for your TAP campaigns. We never change your shop without your approval, and we never touch your account settings or bank details. We follow Malaysia's Personal Data Protection Act (PDPA). Read our Privacy Policy and Terms of Service."],
  ["Can I stop at any time?", "Yes. You can stop adding samples or end a product early. Samples already sent can't be taken back, and creators who have them still finish their videos."],
  ["Do you guarantee sales?", "No. We pick the creators most likely to sell, but we don't control them, so we can't promise reach, sales or posting dates. You'll see real numbers from TikTok, updated every day."],
];

/** Sample allocation terms, version 1 (blueprint 11.4c). */
export const TERMS_VERSION = "Version 1 · Oct 2026";
export const TERMS: [string, string][] = [
  ["Techwide decides who gets each sample", "When you add samples to Techwide's TAP campaign, our team approves each creator's request."],
  ["Your creator conditions are a reference", "We use them as a guide, together with each creator's record, when we decide."],
  ["Samples can't be taken back", "Once a sample is sent, you can't ask for it to be returned or refunded."],
  ["We pick creators most likely to bring results", "We look at activity, delivery record, category, TikTok level and sales. If you have questions about who got a sample, ask our support team."],
  ["We don't control creators", "So we're not responsible for their delivery rate, posting dates, speed or content direction."],
  ["We can act on creators who don't deliver", "Creators who are late can lose sample access, or be frozen or banned."],
  ["No guarantee of results", "We don't guarantee reach, sales, GMV or return. Numbers come from TikTok and can be delayed."],
  ["Shipping follows TikTok's rules", "You ship TAP samples through TikTok. Losses, damage and returns in transit are handled under TikTok's rules."],
  ["Product compliance is yours; opinions are the creator's", "You're responsible for your product's labels, certificates and claims. What creators say in their videos is their own view."],
  ["You can stop at any time", "You can stop adding new samples whenever you like. Samples already sent aren't affected."],
  ["We'll ask you again if the terms change", "We'll tell you about any change and ask you to agree again the next time you submit."],
];

export const COUNTRIES: { code: string; name: string; dial: string }[] = [
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "SG", name: "Singapore", dial: "65" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "BN", name: "Brunei", dial: "673" },
  { code: "TH", name: "Thailand", dial: "66" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "VN", name: "Vietnam", dial: "84" },
  { code: "CN", name: "China", dial: "86" },
  { code: "HK", name: "Hong Kong", dial: "852" },
  { code: "TW", name: "Taiwan", dial: "886" },
  { code: "IN", name: "India", dial: "91" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "US", name: "United States", dial: "1" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
];

/**
 * Checks a phone number and tidies it. Malaysian mobiles must be 01x numbers and come out as +60 12-345 6789;
 * other countries just need 6–14 digits.
 */
export function tidyPhone(raw: string, dial: string): { ok: boolean; pretty: string; error?: string } {
  let d = raw.replace(/\D/g, "");
  if (!d) return { ok: false, pretty: "", error: "Enter your phone number" };
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(dial) && d.length > dial.length + 5) d = d.slice(dial.length);
  if (dial === "60") {
    if (d.startsWith("0")) d = d.slice(1);
    if (!/^1\d{8,9}$/.test(d)) return { ok: false, pretty: "", error: "That doesn't look like a Malaysian mobile number. It should start with 01, like 012-345 6789." };
    const pretty = d.length === 9 ? `+60 ${d.slice(0, 2)}-${d.slice(2, 5)} ${d.slice(5)}` : `+60 ${d.slice(0, 2)}-${d.slice(2, 6)} ${d.slice(6)}`;
    return { ok: true, pretty };
  }
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length < 6 || d.length > 14) return { ok: false, pretty: "", error: "Enter 6 to 14 digits, without the country code." };
  return { ok: true, pretty: `+${dial} ${d.replace(/(\d{4})(?=\d)/g, "$1 ")}` };
}

export { PRODUCTS, SELLER, SELLER_RESULTS };

/* ---------------- TAP invites (owner, 28 Oct 2026): campaigns start two ways, both end in the same pipeline ---------------- */

/** A campaign Techwide set up and sent to a seller to register: what the seller sees from the link. */
export const TAP_INVITE = {
  code: "TAP-7Q2",
  from: "Aina",
  team: "Techwide TAP team",
  sent: "28 Oct, 10:05 AM",
  expires: "11 Nov",
  name: "Year-end kitchen push",
  raise: 6,
  samples: 40,
  end: "31 Jan 2027",
  extend: true,
  niche: "Home & Kitchen",
  note: "Your granite pot did well in October. We'd like to push it with about 40 creators before year-end, and try the new thermos too.",
  products: ["x01", "x02"],
};

export type InviteStatus = "Sent" | "Opened" | "Registered" | "Expired";
/** Invites Techwide has sent, as the admin sees them. Registered ones are already in the TAP pipeline. */
export const TAP_INVITES: { code: string; shop: string; name: string; products: number; raise: number; status: InviteStatus; when: string; by: string }[] = [
  { code: "TAP-7Q1", shop: "Dapur Pintar", name: "Raya open house set", products: 3, raise: 5, status: "Registered", when: "26 Oct", by: "Wei Jie" },
  { code: "TAP-7P8", shop: "Lena Home", name: "Bedroom refresh", products: 2, raise: 4, status: "Opened", when: "27 Oct", by: "Nadia" },
  { code: "TAP-7P3", shop: "Mawar Wear", name: "Year-end modest wear", products: 4, raise: 6, status: "Sent", when: "27 Oct", by: "Nadia" },
  { code: "TAP-7M9", shop: "Festa Craft", name: "Back to school", products: 2, raise: 4, status: "Expired", when: "12 Oct", by: "Aina" },
];

/** Days in a row the shop has done at least one daily mission (counted by Rezekii). */
export const SELLER_STREAK = 9;
