/**
 * Extra sample data for the creator site, sign-in, scan results and Marketplace screens (cr1). Invented people, shops and numbers;
 * nothing is read from or sent to TikTok.
 */
import { CREATOR } from "./mock";
import type { IconName } from "@/components/icons";
import type { Raise } from "./mock";

/** Malaysia's 13 states and 3 federal territories (only Malaysia is open for now, so no country picker). */
export const MY_STATES = {
  States: ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu"],
  "Federal territories": ["Kuala Lumpur", "Labuan", "Putrajaya"],
} as const;

/**
 * "012-345 6789", "+60 12 345 6789", "60123456789" → national part "123456789". Mobile prefixes 010–019 except 015;
 * 011 numbers have one digit more.
 */
export function tidyPhone(raw: string): { national: string; e164: string; pretty: string; error: string | null } {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("60")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  const ok = /^11\d{8}$/.test(d) || /^1[02346789]\d{7}$/.test(d);
  const pretty = d.length === 10 ? `${d.slice(0, 2)}-${d.slice(2, 6)} ${d.slice(6)}` : d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)} ${d.slice(5)}` : raw;
  let error: string | null = null;
  if (!raw.trim()) error = "Enter your WhatsApp number";
  else if (!d.startsWith("1")) error = "Use a Malaysian mobile number that starts with 01";
  else if (d.startsWith("15")) error = "015 numbers can't get WhatsApp codes. Use your mobile number.";
  else if (!ok) error = d.startsWith("11") ? "011 numbers have 11 digits, e.g. 011-2345 6789" : "Mobile numbers have 10 digits, e.g. 012-345 6789";
  return { national: d, e164: `+60${d}`, pretty, error };
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/* ---------------- Landing ---------------- */

export const STORIES = [
  {
    handle: "@kak.ros.kitchen", name: "Rosnah Ismail", initials: "RI", state: "Johor", level: "Gold", bg: "linear-gradient(135deg,#ffb35c,#f08a00)",
    big: "12", bigLabel: "better rates in her first scan",
    quote: "I had more than 300 kitchen products in my showcase and never checked the rates. The first scan found 12 paying more through Techwide. I added all of them before lunch.",
    facts: [["12", "products paying more"], ["+1% to +4%", "more per product"]],
  },
  {
    handle: "@mei.ling.deals", name: "Tan Mei Ling", initials: "TM", state: "Kuala Lumpur", level: "Silver", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)",
    big: "40 min", bigLabel: "saved every night",
    quote: "I used to upload the same video to TikTok, Instagram and Facebook one by one. Now I upload once and schedule all three. My Reels started selling too.",
    facts: [["3 apps", "from one upload"], ["31 days", "posting in a row"]],
  },
  {
    handle: "@hafiz.tech", name: "Hafiz Roslan", initials: "HR", state: "Selangor", level: "Bronze", bg: "linear-gradient(135deg,#22dc95,#00a862)",
    big: "4 days", bigLabel: "from sign-up to his first sample",
    quote: "I was new and didn't know a single seller. An open sample got me my first product to review, and I posted all 3 videos on time.",
    facts: [["3 of 3", "videos delivered"], ["RM 420", "sales, first month"]],
  },
] as const;

/** Landing FAQ (owner, 30 Oct 2026): most-asked first, and general answers only, no fixed rates or rules creators could argue with. */
export const FAQS: [string, string][] = [
  ["Is Rezekii free?", "Yes, it's free to join. TikTok Shop pays your commission as usual, and we don't take a cut of it."],
  ["How much more commission will I get?", "It depends on the product and your account. Many products pay more through Rezekii, some don't. You always see the rate before you add anything."],
  ["Can Rezekii lower my commission?", "No. The showcase scanner only shows products where Rezekii pays you more. It never lists a product that would lower your commission, so if you already have a better rate, it stays as it is."],
  ["Will my old videos be affected?", "No. Your videos and links keep working. The better rate counts for sales from your new videos."],
  ["How do free samples work?", "Pick a sample in Rezekii and we take you to TikTok to tap Apply, then come back to follow it here. The Rezekii team reviews it. Each seller sets their own requirements, and some are strict, so we negotiate the best we can for you and keep you updated."],
  ["Is my TikTok account safe?", "Yes. Linking TikTok Shop lets us read your showcase, orders and samples to find better rates. We never post or change anything without your approval, and we never touch your account settings or bank details. We follow Malaysia's Personal Data Protection Act (PDPA). Read our Privacy Policy and Terms of Service."],
  ["Why can Rezekii pay more?", "Rezekii is an agency. Sellers hire us to manage their affiliates, and they pay us for it, not you. That's how creators on Rezekii get better rates."],
  ["Is signing in with TikTok the same as linking TikTok Shop?", "No. Signing in only logs you in. You link TikTok Shop separately, and you can disconnect it at any time."],
  ["Who sees my contact details?", "Only our team, to help with samples and your account. Sellers never see them."],
];

/* ---------------- Scan results ---------------- */

/** Why a better rate can't be added yet (by raise id). */
export const NOT_ELIGIBLE: Record<string, string> = {
  r6: "The seller limits this rate to creators at TikTok Lv.5 or above. You're Lv.4.",
};

/** What a fresh scan finds in this preview. */
export const NEW_ON_RESCAN: Raise = { id: "r7", productId: "p16", nowRate: 6, tapRate: 9, until: "31 Dec", eligible: true };

/** Shown to Bronze creators only (owner, 28 Oct 2026): what Silver would unlock, a nudge to grow, never addable at Bronze. */
export const SILVER_UNLOCKS = ["p03", "p20", "p09"];

/** A product TikTok refused to add; it stays hidden from results for 30 days. */
export const REFUSED = { productId: "p17", tiktok: "Adding product failed. Please contact TikTok.", hiddenUntil: "27 Nov" };

/* ---------------- Samples ---------------- */

/**
 * No sample pools or tiers (owner, 30 Oct 2026: too many rankings confuse). A sample is open to anyone, or the seller asks
 * for a posting streak (10 days, 30 days...). She can request it once her streak is long enough.
 */
const CREATOR_STREAK = CREATOR.streak;
export const canGetSample = (streak: number | null) => streak !== null && CREATOR_STREAK >= streak;

/** `fix`: where she sorts it out herself (link TikTok Shop, fill in her profile); Back brings her to the product again. */
export type Cond = { label: string; ok: boolean; you: string; fix?: string };
/** The seller's own conditions on top of the pool rules (by product id). */
export const SELLER_CONDS: Record<string, Cond[]> = {
  p08: [{ label: "Seller: Home & Kitchen creator", ok: true, you: "Home & Kitchen is your top category" }, { label: "Seller: Silver or Gold", ok: true, you: "You're Silver" }],
  p18: [{ label: "Seller: TikTok Lv.5 or above", ok: false, you: "You're Lv.4" }],
  p24: [{ label: "Seller: Silver or Gold", ok: true, you: "You're Silver" }],
  p14: [{ label: "Seller: Home & Kitchen videos in the last 30 days", ok: true, you: "You posted 9" }],
  p03: [{ label: "Seller: Fashion videos in the last 30 days", ok: true, you: "You posted 4" }],
  p20: [{ label: "Seller: Muslim fashion audience", ok: true, you: "Your Muslim fashion videos sell 2.3× your average" }],
  p05: [{ label: "Seller: Fashion sales in the last 30 days", ok: true, you: "Fashion is 46% of your sales" }],
};

/** One-off sample notes, so the grid feels real. */
/** Samples asked for and left on one product (sample; the real app reads TikTok's live counts). */
export function sampleCount(id: string) {
  const left = SAMPLE_LEFT[id] ?? 10;
  const total = Math.max(20, Math.ceil((left * 2.5) / 10) * 10);
  return { left, applied: total - left, total };
}
export const SAMPLE_LEFT: Record<string, number> = { p01: 18, p02: 40, p04: 9, p07: 25, p09: 32, p11: 12, p12: 30, p13: 50, p16: 7, p17: 20, p19: 11, p21: 6, p22: 15, p03: 8, p05: 10, p14: 5, p20: 6, p08: 3, p18: 2, p24: 4 };

/* ---------------- Notifications ---------------- */

/** `urgent` notes have a deadline or block her earnings; they sit on top in red (owner, 29 Oct 2026). */
export type Note = { id: string; day: "Today" | "Earlier"; when: string; icon: IconName; bg: string; title: string; line: string; href?: string; cta: string; action?: "reconnect"; urgent?: string };
export const NOTES: Note[] = [
  { id: "n1", day: "Today", when: "10:24", icon: "gift", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)", title: "Sample approved: High-waist yoga pants", line: "Urban Basics MY will ship it through TikTok. Post your first video within 1 day of receiving it for the biggest bonus.", href: "/app/account#samples", cta: "See sample" },
  { id: "n2", day: "Today", when: "09:12", icon: "scan", bg: "linear-gradient(135deg,#22dc95,#00a862)", title: "New commission chance: Straight-leg casual pants", line: "Already in your showcase. 6% now, 9% through Techwide until 31 Dec.", href: "/app#scan", cta: "See scan results" },
  { id: "n3", day: "Today", when: "08:40", icon: "alert", bg: "linear-gradient(135deg,#ffb35c,#f08a00)", urgent: "5 days left", title: "Reconnect TikTok Shop in 5 days", line: "TikTok asks you to approve access again every year. Reconnect so scans and commission numbers keep working.", cta: "Reconnect", action: "reconnect" },
  { id: "n4", day: "Earlier", when: "Yesterday 21:40", icon: "trophy", bg: "linear-gradient(135deg,#ffd34d,#e8a400)", title: "Mission done: Post today (tier 3)", line: "+20 credits are in your wallet. 2 more posts today opens the next chest.", href: "/app/rewards", cta: "See missions" },
  { id: "n5", day: "Earlier", when: "Yesterday 18:05", icon: "video", bg: "linear-gradient(135deg,#ff7aa8,#e8005a)", title: "Video counted: 1.2L 316 stainless thermos", line: "2 videos posted. One more unlocks the bonus.", href: "/app/account#samples", cta: "See progress" },
  { id: "n6", day: "Earlier", when: "26 Oct", icon: "x", bg: "linear-gradient(135deg,#9aa8a1,#62716a)", title: "Sample not approved: Granite casserole pot", line: "This sample unlocks at a 30-day streak. Keep posting daily: 14 more days to get there.", href: "/app/account#samples", cta: "What to do" },
  { id: "n7", day: "Earlier", when: "20 Oct", icon: "bag", bg: "linear-gradient(135deg,#22dc95,#00a862)", title: "From your wish list: AirySoft pillowcase is on Rezekii", line: "9% now, +3% for you. Your commitment starts today: 4 videos a month for 3 months.", href: "/app/market", cta: "Open Marketplace" },
];

/**
 * Her own orders per product since she started on TikTok Shop (sample), for the recap's "money left on the table". The real
 * one reads her order history from TikTok, as far back as TikTok keeps it, and the card says from when.
 */
export const ORDER_HISTORY = {
  since: "Mar 2025",
  byProduct: [
    { productId: "p13", orders: 1320 },
    { productId: "p22", orders: 860 },
    { productId: "p09", orders: 410 },
    { productId: "p01", orders: 2150 },
    { productId: "p21", orders: 640 },
    { productId: "p16", orders: 380 },
  ],
};
