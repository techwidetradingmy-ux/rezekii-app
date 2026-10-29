/**
 * Admin (Techwide staff) sample data for the preview. Builds on mock.ts (TAP_PIPELINE, SAMPLE_REVIEW, PEOPLE).
 * Every shop, person and number is invented. Nothing here is read from or sent to TikTok.
 */
import { PEOPLE, PRODUCTS, SAMPLE_REVIEW, TAP_PIPELINE, type Verdict } from "./mock";

export const ME = "Aina";
export const TZ = "Asia/Kuala_Lumpur";
export const TODAY_LABEL = "Wednesday, 28 October";

/* ---------------- Staff and roles ---------------- */

export type Role = "Super Admin" | "Ops" | "Business" | "Growth" | "Finance";
export const ROLES: Role[] = ["Super Admin", "Ops", "Business", "Growth", "Finance"];
export const ROLE_NOTE: Record<Role, string> = {
  "Super Admin": "Everything, plus staff access and the audit log",
  Ops: "TAP pipeline, user review, custom service, sample review",
  Business: "Merchants and creators they bring in, performance, open campaigns",
  Growth: "Missions, referrals, progress per person",
  Finance: "Ledger, reconciliation, credit adjustments (second approver)",
};

export type Staff = { name: string; short: string; email: string; role: Role; since: string; last: string };
export const STAFF: Staff[] = [
  { name: "Hazwan Idris", short: "Hazwan", email: "hazwan@rezekii.com", role: "Super Admin", since: "1 Mar 2026", last: "Today 09:40" },
  { name: "Aina Sofea", short: "Aina", email: "aina@rezekii.com", role: "Ops", since: "4 Mar 2026", last: "Now" },
  { name: "Kumaresan Raj", short: "Kumar", email: "kumar@rezekii.com", role: "Ops", since: "18 May 2026", last: "Today 10:05" },
  { name: "Lim Wei Jie", short: "Wei Jie", email: "weijie@rezekii.com", role: "Business", since: "2 Jun 2026", last: "Today 08:52" },
  { name: "Nadia Kamal", short: "Nadia", email: "nadia@rezekii.com", role: "Business", since: "9 Jul 2026", last: "Yesterday 18:20" },
  { name: "Priya Nair", short: "Priya", email: "priya@rezekii.com", role: "Growth", since: "21 Jul 2026", last: "Today 10:31" },
  { name: "Farid Hakim", short: "Farid", email: "farid@rezekii.com", role: "Finance", since: "4 Mar 2026", last: "Today 09:58" },
];

/** Accounts that exist on Rezekii but don't have Admin Access yet (search on the Access page). */
export const PLAIN_ACCOUNTS = [
  { name: "Syafiq Rahim", email: "syafiq@rezekii.com", kind: "Creator account", joined: "12 Oct 2026" },
  { name: "Jessica Ong", email: "jessica@rezekii.com", kind: "Creator account", joined: "20 Oct 2026" },
  { name: "Arif Zainal", email: "arif.z@gmail.com", kind: "Creator account", joined: "3 Aug 2026" },
  { name: "Mei Ling Tan", email: "meiling@serilivingmy.com", kind: "Seller account", joined: "12 Sep 2026" },
];

/* ---------------- TAP pipeline ---------------- */

export const COLS = ["New", "In review", "To submit", "Waiting on TikTok", "Not approved", "Live"] as const;
export type Col = (typeof COLS)[number];

export type TaskState = "Success" | "Failed" | "Person" | "Waiting" | "Done by hand" | "Running";
export type ExtTask = { id: string; name: string; state: TaskState; extId?: string; at?: string; message?: string; retry?: [number, number]; nextRetry?: string; why?: string };
export type TicketItem = { name: string; img?: string; publicRate: number | null; rate: number; samples: number };
export type Ticket = {
  id: string; col: Col; shop: string; what: string; age: string; late?: boolean; fail?: boolean;
  shopId: string; source: string; synced?: boolean; owner: string | null; campaign: string; dates: string;
  items: TicketItem[]; tasks: ExtTask[]; history: { when: string; what: string; who: string }[];
  notes: { who: string; when: string; text: string }[];
  reason?: string; block?: string; batchFail?: string;
};

const P = (id: string, samples: number): TicketItem => {
  const p = PRODUCTS.find((x) => x.id === id)!;
  return { name: p.name, img: p.img, publicRate: p.publicRate, rate: p.partnerRate, samples };
};
const done = (id: string, name: string, extId: string, at: string): ExtTask => ({ id, name, state: "Success", extId, at });

type Detail = Omit<Ticket, "id" | "col" | "shop" | "what" | "age" | "late" | "fail">;
const DETAIL: Record<string, Detail> = {
  "TAP-0418": {
    shopId: "7495 0218 3341", source: "QR · KL Expo (Wei Jie)", owner: null, campaign: "Home & Kitchen · Nov–Dec", dates: "1 Nov – 31 Dec 2026",
    items: [P("p21", 40), P("p24", 30)], tasks: [],
    history: [{ when: "28 Oct 09:41", what: "Submitted from the KL Expo QR code", who: "Seri Living MY" }], notes: [],
  },
  "TAP-0417": {
    shopId: "7311 8820 1902", source: "Seller Center sync", synced: true, owner: null, campaign: "Electronics · Q4", dates: "1 Nov 2026 – 31 Jan 2027",
    items: [P("p13", 50), { name: "Magnetic power bank 10,000 mAh", publicRate: 10, rate: 14, samples: 30 }, { name: "65W GaN wall charger", publicRate: 8, rate: 12, samples: 30 }, { name: "Wireless earbuds with ANC", publicRate: 12, rate: 16, samples: 40 }, { name: "Phone tripod with remote", publicRate: 10, rate: 15, samples: 30 }],
    tasks: [], history: [{ when: "28 Oct 07:12", what: "Synced in: registered directly in Seller Center", who: "System" }], notes: [],
  },
  "TAP-0412": {
    shopId: "7402 5560 7719", source: "Rezekii (seller app)", owner: "Aina", campaign: "Home & Kitchen · Nov–Dec", dates: "1 Nov – 31 Dec 2026",
    items: [P("p14", 30), { name: "Glass food container set (5 pcs)", publicRate: 6, rate: 9, samples: 30 }, { name: "Silicone spatula set", publicRate: 8, rate: 12, samples: 40 }, { name: "Electric milk frother", publicRate: 6, rate: 10, samples: 30 }, { name: "Stainless steel dish rack", publicRate: 5, rate: 8, samples: 30 }, { name: "Vacuum seal food bags", publicRate: null, rate: 10, samples: 50 }],
    tasks: [],
    history: [{ when: "24 Oct 15:02", what: "Submitted, 6 products", who: "Dapur Pintar" }, { when: "25 Oct 09:10", what: "Assigned to Aina", who: "Kumar" }, { when: "26 Oct 09:00", what: "Review due (2 working days)", who: "System" }],
    notes: [{ who: "Aina", when: "26 Oct", text: "Vacuum seal bags: public rate not readable. Asked the seller for a screenshot from Seller Center." }],
  },
  "TAP-0409": {
    shopId: "7288 1043 5521", source: "Rezekii (seller app)", owner: "Aina", campaign: "Fashion · Office wear", dates: "1 Nov – 30 Nov 2026",
    items: [P("p09", 40), { name: "Pleated midi skirt", publicRate: 8, rate: 12, samples: 30 }, { name: "Oversized blazer", publicRate: 6, rate: 10, samples: 30 }],
    tasks: [
      done("t1", "Product registration", "1730 4471 0921", "27 Oct 10:21"),
      { id: "t2", name: "Commission setting", state: "Failed", message: "rate out of range", retry: [2, 5], nextRetry: "10:40" },
      { id: "t3", name: "Accept seller request", state: "Person", why: "TikTok's API can't do this step. Do it in Partner Center." },
    ],
    history: [{ when: "22 Oct 11:30", what: "Submitted, 3 products", who: "Mawar Wear" }, { when: "25 Oct 16:44", what: "Review passed", who: "Aina" }, { when: "27 Oct 10:21", what: "Product registration succeeded", who: "System" }, { when: "27 Oct 10:22", what: "Commission setting failed (rate out of range)", who: "System" }],
    notes: [{ who: "Aina", when: "27 Oct", text: "Blazer commission might be above TikTok's cap for Fashion. Checking with the seller." }],
  },
  "TAP-0401": {
    shopId: "7120 6650 2290", source: "Rezekii (seller app)", owner: "Kumar", campaign: "Home & Living · Q4", dates: "15 Oct – 31 Dec 2026",
    items: [P("p17", 30), { name: "Bamboo bedsheet set, queen", publicRate: 6, rate: 10, samples: 30 }],
    tasks: [done("t1", "Product registration", "1730 4398 1104", "25 Oct 14:02"), done("t2", "Commission setting", "1730 4398 1105", "25 Oct 14:02"), { id: "t3", name: "TikTok review of the request", state: "Waiting", why: "Submitted 3 days ago. TikTok usually replies within 5 days." }],
    history: [{ when: "20 Oct 10:12", what: "Submitted, 2 products", who: "Lena Home" }, { when: "23 Oct 09:30", what: "Review passed", who: "Kumar" }, { when: "25 Oct 14:02", what: "Sent to TikTok", who: "System" }],
    notes: [],
  },
  "TAP-0399": {
    shopId: "7099 2210 8834", source: "Rezekii (change request)", owner: "Kumar", campaign: "Household · Cleaning", dates: "1 Oct – 30 Nov 2026",
    items: [{ ...P("p22", 30), rate: 19 }],
    tasks: [done("t1", "Commission change 17% → 19%", "1730 4320 7781", "24 Oct 11:15"), { id: "t2", name: "TikTok review of the change", state: "Waiting", why: "Changes to a live campaign take TikTok up to 7 days." }],
    history: [{ when: "23 Oct 17:20", what: "Asked to raise commission to 19%", who: "Bersih Pro" }, { when: "24 Oct 11:15", what: "Change sent to TikTok", who: "System" }],
    notes: [],
  },
  "TAP-0395": {
    shopId: "7066 7781 0012", source: "Seller Center sync", synced: true, owner: "Kumar", campaign: "Party · Year-end", dates: "—",
    items: [{ ...P("p23", 0) }],
    tasks: [], reason: "0 samples. Registered directly in Seller Center and synced in. Samples must be 1 or more (we suggest 30–50 per SKU). Seller notified.",
    history: [{ when: "23 Oct 08:05", what: "Synced in: registered directly in Seller Center", who: "System" }, { when: "23 Oct 08:05", what: "Not approved automatically: 0 samples", who: "System" }, { when: "23 Oct 08:06", what: "Seller notified in app and by email", who: "System" }],
    notes: [],
  },
  "TAP-0380": {
    shopId: "6950 1182 4410", source: "Rezekii (seller app)", owner: "Aina", campaign: "Urban Basics · Year-end", dates: "1 Sep – 31 Dec 2026",
    items: [P("p01", 50), P("p02", 50), P("p04", 40), P("p07", 30)],
    tasks: [done("t1", "Product registration", "1730 3910 2210", "30 Aug 10:02"), done("t2", "Commission setting", "1730 3910 2211", "30 Aug 10:02"), done("t3", "Auto-extend set", "1730 3910 2290", "30 Aug 10:03")],
    history: [{ when: "28 Aug 12:00", what: "Submitted, 4 products", who: "Urban Basics MY" }, { when: "29 Aug 09:12", what: "Review passed", who: "Aina" }, { when: "1 Sep 00:00", what: "Live", who: "TikTok" }],
    notes: [],
  },
};

const EXTRA: Ticket[] = [
  { id: "TAP-0419", col: "New", shop: "Teh Tarik Co.", what: "1 product · Rezekii", age: "20 min", shopId: "7510 0021 9983", source: "Rezekii (seller app)", owner: null, campaign: "Food & Drinks · Nov", dates: "1 Nov – 30 Nov 2026", items: [{ name: "3-in-1 teh tarik, 30 sachets", publicRate: 8, rate: 12, samples: 40 }], tasks: [], history: [{ when: "28 Oct 10:22", what: "Submitted, 1 product", who: "Teh Tarik Co." }], notes: [] },
  { id: "TAP-0406", col: "In review", shop: "Kedai Kasih", what: "3 products · Kumar", age: "1 d", shopId: "7380 4410 2251", source: "QR · Penang Expo (Nadia)", owner: "Kumar", campaign: "Muslim Fashion · Nov", dates: "1 Nov – 30 Nov 2026", items: [P("p20", 40), { name: "Instant shawl, chiffon", publicRate: 8, rate: 12, samples: 30 }, { name: "Telekung travel set", publicRate: 6, rate: 10, samples: 30 }], tasks: [], history: [{ when: "27 Oct 14:00", what: "Submitted from the Penang Expo QR code", who: "Kedai Kasih" }, { when: "27 Oct 15:10", what: "Assigned to Kumar", who: "Aina" }], notes: [] },
  { id: "TAP-0410", col: "To submit", shop: "Nur Skin Lab", what: "3 products · ready", age: "5 h", shopId: "7392 1180 6672", source: "Rezekii (seller app)", owner: "Kumar", campaign: "Beauty · Nov", dates: "1 Nov – 30 Nov 2026", items: [{ name: "Niacinamide serum 30 ml", publicRate: 10, rate: 15, samples: 50 }, { name: "Gentle foam cleanser", publicRate: 10, rate: 14, samples: 40 }, { name: "Sunscreen SPF50 gel", publicRate: 8, rate: 12, samples: 40 }], tasks: [], history: [{ when: "26 Oct 10:00", what: "Submitted, 3 products", who: "Nur Skin Lab" }, { when: "28 Oct 05:40", what: "Review passed", who: "Kumar" }], notes: [] },
  { id: "TAP-0411", col: "To submit", shop: "Kopi Senja", what: "2 products · ready", age: "6 h", shopId: "7401 7720 0198", source: "QR · KL Expo (Wei Jie)", owner: "Aina", campaign: "Food & Drinks · Nov", dates: "1 Nov – 30 Nov 2026", items: [{ name: "Kopi O kampung, 1 kg", publicRate: 6, rate: 10, samples: 30 }, { name: "Cold brew bags (10)", publicRate: 8, rate: 12, samples: 30 }], tasks: [], history: [{ when: "26 Oct 15:30", what: "Submitted from the KL Expo QR code", who: "Kopi Senja" }, { when: "28 Oct 04:12", what: "Review passed", who: "Aina" }], notes: [], batchFail: "TikTok: product not eligible (Kopi O kampung needs a food licence on file)" },
  { id: "TAP-0413", col: "To submit", shop: "Bayu Baby", what: "4 products · ready", age: "8 h", shopId: "7405 3361 7710", source: "Rezekii (seller app)", owner: "Aina", campaign: "Mother & Baby · Nov–Dec", dates: "1 Nov – 31 Dec 2026", items: [{ name: "Baby wipes, 80 sheets x 6", publicRate: 6, rate: 9, samples: 50 }, { name: "Muslin swaddle, 3 pack", publicRate: 8, rate: 12, samples: 30 }, { name: "Silicone bib set", publicRate: 8, rate: 12, samples: 30 }, { name: "Diaper bag backpack", publicRate: 6, rate: 10, samples: 30 }], tasks: [], history: [{ when: "25 Oct 09:00", what: "Submitted, 4 products", who: "Bayu Baby" }, { when: "28 Oct 02:20", what: "Review passed", who: "Aina" }], notes: [] },
  { id: "TAP-0414", col: "To submit", shop: "Pasar Pagi Snacks", what: "2 products · ready", age: "9 h", shopId: "7406 9921 3302", source: "Seller Center sync", synced: true, owner: "Kumar", campaign: "Food & Drinks · Nov", dates: "1 Nov – 30 Nov 2026", items: [{ name: "Kerepek pisang, 500 g", publicRate: 10, rate: 14, samples: 40 }, { name: "Rempeyek kacang, 3 tubs", publicRate: 10, rate: 13, samples: 30 }], tasks: [], history: [{ when: "27 Oct 07:12", what: "Synced in: registered directly in Seller Center", who: "System" }, { when: "28 Oct 01:30", what: "Review passed", who: "Kumar" }], notes: [] },
  { id: "TAP-0415", col: "To submit", shop: "Halia Herbs", what: "2 products · ready", age: "10 h", shopId: "7407 1103 5512", source: "QR · KL Expo (Wei Jie)", owner: "Aina", campaign: "Health · Nov–Dec", dates: "1 Nov – 31 Dec 2026", items: [{ name: "Ginger honey drink, 20 sachets", publicRate: 8, rate: 12, samples: 30 }, { name: "Herbal balm roll-on", publicRate: 10, rate: 15, samples: 40 }], tasks: [], history: [{ when: "26 Oct 12:10", what: "Submitted from the KL Expo QR code", who: "Halia Herbs" }, { when: "28 Oct 00:40", what: "Review passed", who: "Aina" }], notes: [] },
  { id: "TAP-0416", col: "To submit", shop: "Lumi Beauty", what: "5 products · ready", age: "12 h", shopId: "7408 2271 0044", source: "Rezekii (seller app)", owner: "Kumar", campaign: "Beauty · Nov", dates: "1 Nov – 30 Nov 2026", items: [{ name: "Lip tint, 6 shades", publicRate: 10, rate: 15, samples: 50 }, { name: "Cushion foundation", publicRate: 8, rate: 12, samples: 40 }, { name: "Brow pencil", publicRate: 10, rate: 14, samples: 40 }, { name: "Setting spray", publicRate: 8, rate: 12, samples: 30 }, { name: "Makeup sponge set", publicRate: 12, rate: 16, samples: 30 }], tasks: [], history: [{ when: "25 Oct 20:00", what: "Submitted, 5 products", who: "Lumi Beauty" }, { when: "27 Oct 22:10", what: "Review passed", who: "Kumar" }, { when: "28 Oct 06:00", what: "Shop authorisation expired", who: "System" }], notes: [], block: "Seller's shop authorisation expired. Waiting for them to reconnect." },
  { id: "TAP-0402", col: "Waiting on TikTok", shop: "Urban Basics MY", what: "Add 3 products", age: "2 d", shopId: "6950 1182 4410", source: "Rezekii (change request)", owner: "Aina", campaign: "Urban Basics · Year-end", dates: "1 Sep – 31 Dec 2026", items: [P("p05", 40), P("p06", 30), P("p10", 30)], tasks: [done("t1", "Product registration", "1730 4402 6610", "26 Oct 16:40"), { id: "t2", name: "TikTok review of the request", state: "Waiting", why: "Submitted 2 days ago." }], history: [{ when: "25 Oct 11:00", what: "Asked to add 3 products to the live campaign", who: "Urban Basics MY" }, { when: "26 Oct 16:40", what: "Sent to TikTok", who: "System" }], notes: [] },
  { id: "TAP-0393", col: "Not approved", shop: "Gaya Kids", what: "Commission +1% (Seller Center)", age: "6 d", shopId: "7044 1290 3381", source: "Seller Center sync", synced: true, owner: "Kumar", campaign: "Kids · Nov", dates: "—", items: [{ name: "Kids rain jacket", publicRate: 6, rate: 7, samples: 30 }], tasks: [], reason: "Commission 7% is only 1% above the public 6%. It must be at least 2% above. Registered directly in Seller Center and synced in. Seller notified.", history: [{ when: "22 Oct 07:12", what: "Synced in: registered directly in Seller Center", who: "System" }, { when: "22 Oct 07:12", what: "Not approved automatically: commission +1%", who: "System" }], notes: [] },
  { id: "TAP-0371", col: "Live", shop: "Seri Living MY", what: "Ends 6 Nov · auto-extend off", age: "—", shopId: "7495 0218 3341", source: "QR · KL Expo (Wei Jie)", owner: "Kumar", campaign: "Seri Living · Home & Kitchen", dates: "6 Sep – 6 Nov 2026", items: [P("p08", 30), P("p11", 50), P("p18", 30)], tasks: [done("t1", "Product registration", "1730 3880 0101", "5 Sep 10:20"), done("t2", "Commission setting", "1730 3880 0102", "5 Sep 10:20")], history: [{ when: "6 Sep 00:00", what: "Live", who: "TikTok" }], notes: [] },
  { id: "TAP-0366", col: "Live", shop: "Volt Gadget", what: "Ends 2 Nov · auto-extend off", age: "—", shopId: "7311 8820 1902", source: "Rezekii (seller app)", owner: "Aina", campaign: "Volt Gadget · Cables & charging", dates: "2 Sep – 2 Nov 2026", items: [P("p13", 50)], tasks: [done("t1", "Product registration", "1730 3851 7710", "1 Sep 09:00"), done("t2", "Commission setting", "1730 3851 7711", "1 Sep 09:00")], history: [{ when: "2 Sep 00:00", what: "Live", who: "TikTok" }], notes: [] },
];

export const TICKETS: Ticket[] = [
  ...TAP_PIPELINE.flatMap((c) => c.items.map((it) => ({ ...(it as { id: string; shop: string; what: string; age: string; late?: boolean; fail?: boolean }), col: c.col as Col, ...DETAIL[it.id] }))),
  ...EXTRA,
];

/* ---------------- TAP campaigns ---------------- */

export type Campaign = { id: string; name: string; shop: string; products: number; imgs: string[]; end: string; days: number; status: "Live" | "Ended"; auto: boolean; gmv30: number; failExtend?: string };
export const CAMPAIGNS: Campaign[] = [
  { id: "C-124", name: "Cables & charging", shop: "Volt Gadget", products: 6, imgs: ["/products/tap-13.jpg"], end: "2 Nov 2026", days: 5, status: "Live", auto: false, gmv30: 21480 },
  { id: "C-121", name: "Home & Kitchen", shop: "Seri Living MY", products: 5, imgs: ["/products/tap-08.jpg", "/products/tap-11.jpg", "/products/tap-21.jpg"], end: "6 Nov 2026", days: 9, status: "Live", auto: false, gmv30: 86420 },
  { id: "C-126", name: "Cleaning", shop: "Bersih Pro", products: 3, imgs: ["/products/tap-22.jpg"], end: "10 Nov 2026", days: 13, status: "Live", auto: true, gmv30: 18240 },
  { id: "C-129", name: "Kitchen tools", shop: "Dapur Pintar", products: 6, imgs: ["/products/tap-14.jpg"], end: "11 Nov 2026", days: 14, status: "Live", auto: false, gmv30: 9310, failExtend: "TikTok: campaign has a commission change waiting for review" },
  { id: "C-119", name: "Office wear", shop: "Mawar Wear", products: 8, imgs: ["/products/tap-09.jpg"], end: "30 Nov 2026", days: 33, status: "Live", auto: false, gmv30: 12880 },
  { id: "C-127", name: "Bedding", shop: "Lena Home", products: 4, imgs: ["/products/tap-17.jpg"], end: "15 Dec 2026", days: 48, status: "Live", auto: true, gmv30: 6120 },
  { id: "C-118", name: "Year-end basics", shop: "Urban Basics MY", products: 14, imgs: ["/products/tap-01.jpg", "/products/tap-02.jpg", "/products/tap-05.jpg"], end: "31 Dec 2026", days: 64, status: "Live", auto: true, gmv30: 142300 },
  { id: "C-110", name: "Merdeka decorations", shop: "Festa Craft", products: 2, imgs: ["/products/tap-23.jpg"], end: "20 Oct 2026", days: -8, status: "Ended", auto: false, gmv30: 2210 },
];
/** TikTok allows a TAP campaign to run up to 90 days from today. */
export const LONGEST_END = "26 Jan 2027";

/* ---------------- Sample review (system pre-review) ---------------- */

export type SampleReq = {
  id: string; handle: string; productId: string; streak: number; verdict: Verdict; summary: string; asked: string;
  tier: "New" | "Active" | "Highly active"; days: number; delivery: string; deliveryOk: boolean; overdue: number;
  level: string; tt: number; category: string; categoryOk: boolean; seller: string; sellerOk: boolean; missing?: string; creatorSees?: string;
};
type Facts = Omit<SampleReq, "id" | "handle" | "productId" | "streak" | "verdict" | "summary">;
const FACTS: Record<string, Facts> = {
  "SR-221": { asked: "2 h ago", tier: "Highly active", days: 31, delivery: "100% · 3 of 3 samples (9 videos)", deliveryOk: true, overdue: 0, level: "Silver", tt: 5, category: "Home matches", categoryOk: true, seller: "Silver or above · Home", sellerOk: true },
  "SR-222": { asked: "3 h ago", tier: "Active", days: 11, delivery: "1 in progress · no video yet, due in 2 days", deliveryOk: true, overdue: 0, level: "Bronze", tt: 3, category: "Kitchen matches", categoryOk: true, seller: "None", sellerOk: true },
  "SR-223": { asked: "4 h ago", tier: "New", days: 0, delivery: "No samples yet", deliveryOk: true, overdue: 0, level: "Bronze", tt: 1, category: "No videos yet", categoryOk: false, seller: "30-day streak", sellerOk: false, creatorSees: "This seller asks for a 30-day posting streak. You joined 4 days ago. Many samples need no streak: try the spin chopper or the cotton tee." },
  "SR-224": { asked: "5 h ago", tier: "New", days: 2, delivery: "No samples yet", deliveryOk: true, overdue: 0, level: "Bronze", tt: 2, category: "Electronics matches", categoryOk: true, seller: "None", sellerOk: true },
  "SR-225": { asked: "6 h ago", tier: "Active", days: 14, delivery: "80% · 4 of 5", deliveryOk: false, overdue: 1, level: "Silver", tt: 4, category: "Home matches", categoryOk: true, seller: "30-day streak", sellerOk: false, creatorSees: "You have a sample that's 3 days late (cordless vacuum). Post its videos and you can request samples again." },
};
const EXTRA_SAMPLES: SampleReq[] = [
  { id: "SR-226", handle: "@kak.ros.kitchen", productId: "p08", streak: 30, verdict: "Approve", summary: "Gold creator, 42 days in a row, every sample delivered.", asked: "1 h ago", tier: "Highly active", days: 42, delivery: "100% · 7 of 7 (24 videos)", deliveryOk: true, overdue: 0, level: "Gold", tt: 6, category: "Kitchen matches", categoryOk: true, seller: "Silver or above · Kitchen", sellerOk: true },
  { id: "SR-227", handle: "@mei.ling.deals", productId: "p21", streak: 10, verdict: "Approve", summary: "31 days in a row and delivers on time. Meets the 10-day streak.", asked: "1 h ago", tier: "Highly active", days: 31, delivery: "100% · 4 of 4", deliveryOk: true, overdue: 0, level: "Silver", tt: 5, category: "Home matches", categoryOk: true, seller: "None", sellerOk: true },
  { id: "SR-228", handle: "@nurul.beauty", productId: "p20", streak: 0, verdict: "Approve", summary: "No streak needed, and it matches her Muslim fashion videos.", asked: "2 h ago", tier: "Active", days: 12, delivery: "100% · 1 of 1", deliveryOk: true, overdue: 0, level: "Bronze", tt: 3, category: "Muslim fashion matches", categoryOk: true, seller: "None", sellerOk: true },
  { id: "SR-229", handle: "@ahmad.fitlife", productId: "p05", streak: 10, verdict: "Approve", summary: "Past the 10-day streak this sample needs. Sports matches.", asked: "3 h ago", tier: "Active", days: 14, delivery: "100% · 2 of 2", deliveryOk: true, overdue: 0, level: "Silver", tt: 4, category: "Sports matches", categoryOk: true, seller: "None", sellerOk: true },
  { id: "SR-230", handle: "@aisyah.glow", productId: "p11", streak: 0, verdict: "Approve", summary: "No streak needed, no overdue samples.", asked: "3 h ago", tier: "Active", days: 16, delivery: "100% · 3 of 3", deliveryOk: true, overdue: 0, level: "Silver", tt: 4, category: "Kitchen matches", categoryOk: true, seller: "None", sellerOk: true },
  { id: "SR-231", handle: "@danial.vlogs", productId: "p03", streak: 10, verdict: "Look", summary: "Can't count his videos: TikTok account not linked. Check his profile before deciding.", asked: "4 h ago", tier: "Active", days: 0, delivery: "No samples yet", deliveryOk: true, overdue: 0, level: "Bronze", tt: 3, category: "Unknown", categoryOk: false, seller: "10-day streak", sellerOk: true, missing: "TikTok account not linked, so days in a row and category can't be counted." },
  { id: "SR-232", handle: "@siti.deco", productId: "p17", streak: 0, verdict: "Look", summary: "No streak needed, but she posts beauty videos and this is bedding.", asked: "5 h ago", tier: "Active", days: 18, delivery: "100% · 2 of 2", deliveryOk: true, overdue: 0, level: "Silver", tt: 4, category: "Beauty, not Home", categoryOk: false, seller: "None", sellerOk: true },
  { id: "SR-233", handle: "@hana.mama", productId: "p18", streak: 30, verdict: "Reject", summary: "12 days in a row. This sample needs a 30-day streak.", asked: "6 h ago", tier: "Active", days: 12, delivery: "100% · 1 of 1", deliveryOk: true, overdue: 0, level: "Bronze", tt: 3, category: "Home matches", categoryOk: true, seller: "30-day streak", sellerOk: false, creatorSees: "This seller asks for a 30-day posting streak. You're on day 12 of 30. Keep posting daily and try again." },
];
export const SAMPLES: SampleReq[] = [...SAMPLE_REVIEW.map((s) => ({ ...s, ...FACTS[s.id] })), ...EXTRA_SAMPLES];

/* ---------------- Business (BD) ---------------- */

export const BD_STAFF = ["Lim Wei Jie", "Nadia Kamal"] as const;
export const MERCHANT_STAGES = ["Scanned QR", "Signed up", "Shop connected", "Products submitted", "Live in TAP"];
export const CREATOR_STAGES = ["Signed up", "TikTok Shop linked", "First scan", "First raise", "First sample"];
export const BD = {
  name: "Lim Wei Jie",
  shopLink: "rezekii.com/s/weijie",
  creatorLink: "rezekii.com/c/weijie",
  month: { merchants: 9, creators: 23, live: 4 },
  merchants: [
    { shop: "Seri Living MY", stage: 5, via: "KL Expo QR", when: "12 Sep", contact: "Mei Ling Tan", next: "" },
    { shop: "Halia Herbs", stage: 4, via: "KL Expo QR", when: "24 Oct", contact: "Encik Rahim", next: "In To submit, goes to TikTok today" },
    { shop: "Kopi Senja", stage: 4, via: "KL Expo QR", when: "24 Oct", contact: "Zul", next: "In To submit, goes to TikTok today" },
    { shop: "Teh Tarik Co.", stage: 4, via: "Link", when: "27 Oct", contact: "Vivian", next: "New request, waiting for Ops review" },
    { shop: "Kraf Rotan", stage: 3, via: "KL Expo QR", when: "25 Oct", contact: "Pak Din", next: "Connected shop but hasn't picked products" },
    { shop: "Gaya Kids", stage: 3, via: "Link", when: "20 Oct", contact: "Shirley", next: "Not approved: commission only +1%. Explain the +2% minimum." },
    { shop: "Batik Laila", stage: 2, via: "KL Expo QR", when: "26 Oct", contact: "Laila", next: "Signed up, shop not connected" },
    { shop: "Sambal Mak Teh", stage: 1, via: "KL Expo QR", when: "26 Oct", contact: "—", next: "Scanned at the expo, didn't sign up" },
  ],
  creators: [
    { handle: "@hafiz.tech", stage: 2, when: "22 Oct", next: "Waiting for approval" },
    { handle: "@nurul.beauty", stage: 5, when: "3 Oct", next: "" },
    { handle: "@danial.vlogs", stage: 2, when: "25 Oct", next: "Ask him to link his TikTok account" },
    { handle: "@siti.deco", stage: 4, when: "14 Oct", next: "" },
    { handle: "@ahmad.fitlife", stage: 5, when: "9 Oct", next: "" },
    { handle: "@farah.home", stage: 3, when: "20 Oct", next: "Scanned, hasn't added a raise yet" },
  ],
  followups: [
    { id: "f1", who: "Kraf Rotan", what: "Help pick products to submit (connected 3 days ago)", due: "Today", late: false },
    { id: "f2", who: "Gaya Kids", what: "Explain the +2% minimum and help resubmit", due: "Yesterday", late: true },
    { id: "f3", who: "Batik Laila", what: "Walk through connecting Seller Center", due: "Today", late: false },
    { id: "f4", who: "@danial.vlogs", what: "Ask him to link his TikTok account", due: "Tomorrow", late: false },
  ],
};

export const MERCHANT_PERF = [
  { shop: "Seri Living MY", gmv: 86420, units: 2318, creators: 47, videos: 212, lives: 18, daily: [1.8, 2.1, 2.4, 2.2, 2.9, 3.1, 2.8, 3.4, 3.9, 3.6, 4.2, 4.8, 4.4, 5.1], top: [["@aisyah.glow", 8702], ["@kak.ros.kitchen", 8060.8], ["@mei.ling.deals", 4831.9], ["@ahmad.fitlife", 2244.2]] as [string, number][] },
  { shop: "Urban Basics MY", gmv: 142300, units: 7620, creators: 88, videos: 401, lives: 36, daily: [4.2, 4.6, 5.0, 4.7, 5.6, 6.2, 5.8, 6.1, 6.9, 7.2, 6.8, 7.7, 8.1, 8.6], top: [["@mei.ling.deals", 21880], ["@nurul.beauty", 14210], ["@aisyah.glow", 9930], ["@siti.deco", 6240]] as [string, number][] },
  { shop: "Volt Gadget", gmv: 21480, units: 2148, creators: 19, videos: 64, lives: 5, daily: [0.9, 1.1, 1.0, 1.4, 1.2, 1.6, 1.5, 1.3, 1.8, 1.7, 1.9, 2.2, 2.0, 2.4], top: [["@hafiz.tech", 5210], ["@aisyah.glow", 4120], ["@danial.vlogs", 2010]] as [string, number][] },
  { shop: "Bersih Pro", gmv: 18240, units: 1147, creators: 22, videos: 71, lives: 4, daily: [1.6, 1.4, 1.3, 1.5, 1.2, 1.1, 1.3, 1.0, 1.2, 0.9, 1.1, 1.0, 0.8, 0.9], top: [["@aisyah.glow", 2418], ["@kak.ros.kitchen", 1980]] as [string, number][] },
];

export const OPEN_CAMPAIGNS = [
  { id: "OC-31", name: "11.11 Mega Sale · Home & Kitchen", category: "Home & Kitchen", uplift: "+3% or more", samples: "30–50 per SKU", closes: "3 Nov", starts: "8 Nov", spots: 40, joined: 26 },
  { id: "OC-32", name: "11.11 Mega Sale · Beauty", category: "Beauty", uplift: "+3% or more", samples: "30–50 per SKU", closes: "3 Nov", starts: "8 Nov", spots: 40, joined: 33 },
  { id: "OC-28", name: "Year-end Fashion", category: "Fashion", uplift: "+2% or more", samples: "40 per SKU", closes: "15 Nov", starts: "1 Dec", spots: 60, joined: 21 },
  { id: "OC-29", name: "Back to School 2027", category: "Stationery & Kids", uplift: "+2% or more", samples: "30 per SKU", closes: "30 Nov", starts: "15 Dec", spots: 30, joined: 6 },
  { id: "OC-30", name: "Food & Drinks · Raya prep", category: "Food & Drinks", uplift: "+3% or more", samples: "50 per SKU", closes: "20 Dec", starts: "5 Jan", spots: 50, joined: 9 },
];

export type CustomStatus = "New" | "Quoted" | "In progress" | "Done" | "Declined";
export const CUSTOM: { id: string; shop: string; want: string; budget: string; status: CustomStatus; owner: string | null; when: string; detail: string }[] = [
  { id: "CS-041", shop: "Seri Living MY", want: "Run their whole 11.11 TAP push for them", budget: "Around RM 3,000 a month, flexible", status: "New", owner: null, when: "Today 09:12", detail: "Wants us to pick products, set commission and follow up creators for 11.11. Has 5 products live already." },
  { id: "CS-040", shop: "Halia Herbs", want: "Find 20 creators for a product launch", budget: "Commission only, no fee yet", status: "Quoted", owner: "Wei Jie", when: "Yesterday", detail: "New ginger drink launching 15 Nov. Asked for creators in Health and Food." },
  { id: "CS-038", shop: "Urban Basics MY", want: "Monthly LIVE sessions with 3 creators", budget: "RM 1,500 per session", status: "In progress", owner: "Nadia", when: "22 Oct", detail: "First LIVE on 1 Nov with @mei.ling.deals. Two more creators to confirm." },
  { id: "CS-035", shop: "Volt Gadget", want: "Product photos and short videos", budget: "RM 800 one-off", status: "Declined", owner: "Wei Jie", when: "15 Oct", detail: "Not a service we run. Pointed them to our creator partners." },
  { id: "CS-031", shop: "Bersih Pro", want: "Handle sample shipping follow-ups", budget: "RM 500 a month", status: "Done", owner: "Nadia", when: "2 Oct", detail: "Set up weekly overdue-delivery reports for them." },
];

/* ---------------- Users ---------------- */

export const REVIEW_CREATORS = [
  { handle: "@mira.new", name: "Amira Zulkifli", state: "Perak", tt: 1, followers: 1240, linked: "24 Oct", via: "Sign-up page", flag: "" },
  { handle: "@hafiz.tech", name: "Hafiz Roslan", state: "Selangor", tt: 2, followers: 8920, linked: "22 Oct", via: "Invited by @aisyah.glow", flag: "" },
  { handle: "@danial.vlogs", name: "Danial Haikal", state: "Johor", tt: 3, followers: 21400, linked: "25 Oct", via: "Wei Jie's link", flag: "TikTok account not linked yet" },
  { handle: "@siti.deco2", name: "Siti Nur", state: "Kedah", tt: 1, followers: 310, linked: "27 Oct", via: "Invited by @siti.deco", flag: "Same device as @siti.deco" },
];
export const REVIEW_SELLERS = [
  { shop: "Kraf Rotan", country: "Malaysia", state: "Kelantan", type: "Local", products: 12, via: "KL Expo QR (Wei Jie)", flag: "" },
  { shop: "Shenzhen Brightway", country: "China", state: "—", type: "Cross-border", products: 48, via: "Sign-up page", flag: "Business registration not uploaded" },
  { shop: "Batik Laila", country: "Malaysia", state: "Terengganu", type: "Local", products: 0, via: "KL Expo QR (Wei Jie)", flag: "Shop not connected yet" },
];

export const SELLERS = [
  { shop: "Urban Basics MY", country: "Malaysia", state: "Selangor", type: "Local", status: "Active", live: 14, joined: "28 Aug", bd: "Nadia" },
  { shop: "Seri Living MY", country: "Malaysia", state: "Kuala Lumpur", type: "Local", status: "Active", live: 5, joined: "12 Sep", bd: "Wei Jie" },
  { shop: "Volt Gadget", country: "Malaysia", state: "Penang", type: "Local", status: "Active", live: 6, joined: "30 Aug", bd: "Wei Jie" },
  { shop: "Bersih Pro", country: "Malaysia", state: "Johor", type: "Local", status: "Active", live: 3, joined: "21 Sep", bd: "Nadia" },
  { shop: "Mawar Wear", country: "Malaysia", state: "Kelantan", type: "Local", status: "Active", live: 8, joined: "2 Oct", bd: "Nadia" },
  { shop: "Lena Home", country: "Malaysia", state: "Selangor", type: "Local", status: "Active", live: 4, joined: "15 Oct", bd: "—" },
  { shop: "Dapur Pintar", country: "Malaysia", state: "Perak", type: "Local", status: "Active", live: 6, joined: "18 Sep", bd: "Wei Jie" },
  { shop: "Festa Craft", country: "Malaysia", state: "Melaka", type: "Local", status: "Paused", live: 0, joined: "2 Aug", bd: "—" },
  { shop: "Guangzhou Homey", country: "China", state: "—", type: "Cross-border", status: "Active", live: 22, joined: "5 Sep", bd: "Nadia" },
  { shop: "Lumi Beauty", country: "Malaysia", state: "Kuala Lumpur", type: "Local", status: "Reconnect needed", live: 0, joined: "25 Oct", bd: "—" },
  { shop: "Kedai Kasih", country: "Malaysia", state: "Penang", type: "Local", status: "Active", live: 0, joined: "27 Oct", bd: "Nadia" },
  { shop: "Shenzhen Brightway", country: "China", state: "—", type: "Cross-border", status: "Waiting", live: 0, joined: "27 Oct", bd: "—" },
];

export const NICHE: Record<string, string> = {
  "@aisyah.glow": "Home", "@kak.ros.kitchen": "Kitchen", "@mei.ling.deals": "Fashion", "@farah.home": "Home", "@mira.new": "Beauty", "@hafiz.tech": "Electronics",
};
export type Person = { handle: string; name: string; state: string; level: string; tt: number; activity: string; streak: number; gmv30: number; status: string; mcn: boolean; niche: string; gold?: string; delivery: number; samples: number };
const EXTRA_PEOPLE: Person[] = [
  { handle: "@nurul.beauty", name: "Nurul Huda", state: "Selangor", level: "Bronze", tt: 3, activity: "Active", streak: 12, gmv30: 14210, status: "Approved", mcn: false, niche: "Muslim fashion", delivery: 100, samples: 1 },
  { handle: "@ahmad.fitlife", name: "Ahmad Faiz", state: "Kuala Lumpur", level: "Silver", tt: 4, activity: "Active", streak: 14, gmv30: 8820, status: "Approved", mcn: false, niche: "Sports", delivery: 100, samples: 2 },
  { handle: "@siti.deco", name: "Siti Aminah", state: "Kedah", level: "Silver", tt: 4, activity: "Active", streak: 18, gmv30: 6240, status: "Approved", mcn: false, niche: "Beauty", delivery: 100, samples: 2 },
  { handle: "@zara.home", name: "Zara Lim", state: "Penang", level: "Silver", tt: 4, activity: "Active", streak: 14, gmv30: 9940, status: "Approved", mcn: false, niche: "Home", delivery: 80, samples: 5 },
  { handle: "@danial.vlogs", name: "Danial Haikal", state: "Johor", level: "Bronze", tt: 3, activity: "Active", streak: 0, gmv30: 2010, status: "Waiting", mcn: false, niche: "Electronics", delivery: 100, samples: 0 },
  { handle: "@hana.mama", name: "Hana Yusof", state: "Sabah", level: "Bronze", tt: 3, activity: "Active", streak: 12, gmv30: 1320, status: "Approved", mcn: false, niche: "Home", delivery: 100, samples: 1 },
];
const EXTRA_FACTS: Record<string, { delivery: number; samples: number; gold?: string }> = {
  "@aisyah.glow": { delivery: 100, samples: 5 }, "@kak.ros.kitchen": { delivery: 100, samples: 7, gold: "1 Oct 2026 – 31 Mar 2027" }, "@mei.ling.deals": { delivery: 100, samples: 4 },
  "@farah.home": { delivery: 90, samples: 3 }, "@mira.new": { delivery: 100, samples: 0 }, "@hafiz.tech": { delivery: 100, samples: 0 },
};
export const DIRECTORY: Person[] = [...PEOPLE.map((p) => ({ ...p, niche: NICHE[p.handle] ?? "Home", ...EXTRA_FACTS[p.handle] })), ...EXTRA_PEOPLE];

export const SAMPLE_HISTORY: Record<string, { product: string; when: string; status: string; ok: boolean }[]> = {
  "@aisyah.glow": [{ product: "1.2L 316 stainless thermos", when: "26 Oct", status: "2 videos posted", ok: true }, { product: "900ml spin chopper blender", when: "Shipped", status: "On the way", ok: true }, { product: "Plain cotton tee, unisex", when: "2 Oct", status: "3 videos posted · bonus earned", ok: true }],
  "@kak.ros.kitchen": [{ product: "Granite non-stick casserole pot", when: "12 Oct", status: "3 videos posted + 1 LIVE", ok: true }, { product: "Capsule spin chopper", when: "28 Sep", status: "3 videos posted · bonus earned", ok: true }],
  "@zara.home": [{ product: "Cordless vacuum with mop pad", when: "16 Oct", status: "No video yet · 3 days late · reminded", ok: false }, { product: "AirySoft pillowcase", when: "20 Sep", status: "1 video posted", ok: true }],
};

/* ---------------- Growth ---------------- */

export type MissionStatus = "Live" | "Draft" | "Paused";
export type MissionDef = {
  id: string; who: "Creator" | "Seller"; title: string; trigger: string; goal: string; period: "Once" | "Daily" | "Weekly";
  tiers: string; cap: string; deadline: number | null; late: "Halve the reward" | "Void it"; status: MissionStatus; version: string;
  template: "Story" | "Square"; message: string; cheer: string; start: string; done30: number; people30: number;
};
export const MISSION_DEFS: MissionDef[] = [
  { id: "md1", who: "Creator", title: "Link TikTok Shop", trigger: "tiktok_shop_linked", goal: "1 linked shop", period: "Once", tiers: "100", cap: "Once per person", deadline: 7, late: "Halve the reward", status: "Live", version: "v2", template: "Story", message: "TikTok Shop linked!", cheer: "Now run your first scan to see better rates.", start: "1 Oct 2026", done30: 1310, people30: 1840 },
  { id: "md2", who: "Creator", title: "Run your first scan", trigger: "scan_completed", goal: "1 scan", period: "Once", tiers: "50", cap: "Once per person", deadline: 7, late: "Halve the reward", status: "Live", version: "v1", template: "Story", message: "First scan done", cheer: "We found {n} better rates in your showcase.", start: "1 Oct 2026", done30: 1120, people30: 1840 },
  { id: "md3", who: "Creator", title: "Verify your WhatsApp number", trigger: "whatsapp_verified", goal: "1 verified number", period: "Once", tiers: "30", cap: "Once per person", deadline: 7, late: "Void it", status: "Live", version: "v1", template: "Square", message: "WhatsApp verified", cheer: "The team can now reach you about samples.", start: "1 Oct 2026", done30: 1490, people30: 1840 },
  { id: "md4", who: "Creator", title: "Post today", trigger: "publish_succeeded", goal: "1 / 3 / 5 posts a day", period: "Daily", tiers: "10 / 30 / 60", cap: "60 a day · 1,200 a month", deadline: null, late: "Halve the reward", status: "Live", version: "v2", template: "Story", message: "{n} days in a row!", cheer: "{x} more days to Highly active.", start: "1 Oct 2026", done30: 9420, people30: 2210 },
  { id: "md5", who: "Creator", title: "Post the first sample video early", trigger: "sample_video_posted", goal: "First video within 1 / 3 / 7 days of receiving", period: "Once", tiers: "80 / 50 / 20", cap: "Once per sample", deadline: null, late: "Void it", status: "Live", version: "v1", template: "Story", message: "Early bird!", cheer: "Sellers notice creators who post fast.", start: "15 Oct 2026", done30: 410, people30: 690 },
  { id: "md6", who: "Creator", title: "10 days active in a row", trigger: "streak_reached", goal: "10 days in a row", period: "Once", tiers: "200", cap: "Once per person", deadline: null, late: "Halve the reward", status: "Draft", version: "v1", template: "Story", message: "Active unlocked", cheer: "Advanced samples are now open to you.", start: "—", done30: 0, people30: 0 },
  { id: "md7", who: "Seller", title: "Connect your shop", trigger: "shop_connected", goal: "1 connected shop", period: "Once", tiers: "100", cap: "Once per account", deadline: 7, late: "Halve the reward", status: "Live", version: "v1", template: "Square", message: "Shop connected", cheer: "Pick products and submit in about a minute.", start: "1 Oct 2026", done30: 168, people30: 214 },
  { id: "md8", who: "Seller", title: "Submit your first products", trigger: "product_submitted", goal: "1 submission that passes checks", period: "Once", tiers: "150", cap: "Once per account", deadline: 14, late: "Halve the reward", status: "Live", version: "v1", template: "Square", message: "First products in", cheer: "Our team reviews within 2 working days.", start: "1 Oct 2026", done30: 121, people30: 214 },
  { id: "md9", who: "Seller", title: "Add 5 products to TAP this week", trigger: "product_live", goal: "5 live products", period: "Weekly", tiers: "50 / 120", cap: "120 a week", deadline: null, late: "Void it", status: "Paused", version: "v2", template: "Square", message: "5 products live", cheer: "More products, more creators finding you.", start: "1 Oct 2026", done30: 34, people30: 160 },
];
export const TRIGGERS = ["tiktok_shop_linked", "scan_completed", "whatsapp_verified", "publish_succeeded", "sample_video_posted", "streak_reached", "collab_completed", "referral_qualified", "shop_connected", "product_submitted", "product_live"];

export const PROGRESS_PEOPLE = [
  {
    key: "@farah.home", who: "Farah Aziz", role: "Creator", joined: "20 Oct", missions: [
      { title: "Link TikTok Shop", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Verify your WhatsApp number", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Run your first scan", progress: 1, goal: 1, left: "Done", claimed: false },
      { title: "Post today", progress: 2, goal: 5, left: "Ends 23:59", claimed: false },
      { title: "Post the first sample video early", progress: 0, goal: 1, left: "2 days left for 80", claimed: false },
    ],
  },
  {
    key: "@mira.new", who: "Amira Zulkifli", role: "Creator", joined: "24 Oct", missions: [
      { title: "Link TikTok Shop", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Verify your WhatsApp number", progress: 0, goal: 1, left: "3 days left", claimed: false },
      { title: "Run your first scan", progress: 0, goal: 1, left: "3 days left", claimed: false },
      { title: "Post today", progress: 0, goal: 5, left: "Ends 23:59", claimed: false },
    ],
  },
  {
    key: "Kopi Senja", who: "Kopi Senja", role: "Seller", joined: "24 Oct", missions: [
      { title: "Connect your shop", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Submit your first products", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Add 5 products to TAP this week", progress: 0, goal: 5, left: "Paused", claimed: false },
    ],
  },
  {
    key: "Kraf Rotan", who: "Kraf Rotan", role: "Seller", joined: "25 Oct", missions: [
      { title: "Connect your shop", progress: 1, goal: 1, left: "Done", claimed: true },
      { title: "Submit your first products", progress: 0, goal: 1, left: "11 days left", claimed: false },
    ],
  },
];
export const MISSION_FUNNELS: Record<string, [string, number][]> = {
  md1: [["Signed up", 1840], ["Opened the link screen", 1610], ["Started TikTok sign-in", 1420], ["Approved by TikTok", 1310], ["Claimed reward", 1290]],
  md2: [["Linked TikTok Shop", 1310], ["Opened Scan", 1210], ["Scan finished", 1120], ["Claimed reward", 1080]],
  md3: [["Signed up", 1840], ["Tapped Verify", 1620], ["Sent the WhatsApp message", 1520], ["Verified", 1490], ["Claimed reward", 1450]],
  md4: [["Active creators", 2210], ["Posted 1", 1880], ["Posted 3", 980], ["Posted 5", 410]],
  md5: [["Received a sample", 690], ["Posted within 7 days", 520], ["Within 3 days", 410], ["Within 1 day", 160]],
  md7: [["Signed up", 214], ["Opened Connect", 196], ["Seller Center approved", 168], ["Claimed reward", 160]],
  md8: [["Connected shop", 168], ["Picked products", 150], ["Passed checks", 121], ["Claimed reward", 118]],
  md9: [["Sellers with 1+ live product", 160], ["3+ live", 72], ["5+ live", 34]],
};

export const REFERRALS = [
  { id: "R-901", from: "@aisyah.glow", to: "@hafiz.tech", pair: "Creator → Creator", status: "Reward paid", reward: 50, when: "22 Oct", flag: "" },
  { id: "R-902", from: "@aisyah.glow", to: "@zara.home", pair: "Creator → Creator", status: "Qualified · paying", reward: 50, when: "11 Oct", flag: "" },
  { id: "R-903", from: "Seri Living MY", to: "Kopi Senja", pair: "Seller → Seller", status: "Reward paid", reward: 50, when: "24 Oct", flag: "" },
  { id: "R-904", from: "Urban Basics MY", to: "Mawar Wear", pair: "Seller → Seller", status: "Reward paid", reward: 50, when: "3 Oct", flag: "" },
  { id: "R-905", from: "@siti.deco", to: "@siti.deco2", pair: "Creator → Creator", status: "Held for review", reward: 50, when: "27 Oct", flag: "Same device" },
  { id: "R-906", from: "@aisyah.glow", to: "@farah.home", pair: "Creator → Creator", status: "Signed up · no scan yet", reward: 0, when: "20 Oct", flag: "" },
  { id: "R-907", from: "@danial.vlogs", to: "@danial.reviews", pair: "Creator → Creator", status: "Held for review", reward: 50, when: "26 Oct", flag: "Same TikTok account" },
  { id: "R-908", from: "@kak.ros.kitchen", to: "@mei.ling.deals", pair: "Creator → Creator", status: "Qualified · paying", reward: 50, when: "19 Oct", flag: "" },
  { id: "R-909", from: "Bersih Pro", to: "Kraf Rotan", pair: "Seller → Seller", status: "Signed up · no product yet", reward: 0, when: "25 Oct", flag: "" },
];

/* ---------------- Accounts ---------------- */

export type LedgerRow = { id: string; when: string; account: string; type: "Grant" | "Spend" | "Reserve" | "Adjust" | "Reverse" | "Referral" | "Refund"; amount: number; source: string; expires: string; by: string; status?: "Waiting for approval" | "Approved" };
export const LEDGER_ALL: LedgerRow[] = [
  { id: "L-88213", when: "28 Oct 10:02", account: "@aisyah.glow", type: "Grant", amount: 20, source: "Mission: Post today v3 (tier 3)", expires: "28 Nov", by: "System" },
  { id: "L-88212", when: "28 Oct 09:51", account: "@kak.ros.kitchen", type: "Reserve", amount: -100, source: "Video prompt batch #88", expires: "—", by: "System" },
  { id: "L-88209", when: "28 Oct 09:30", account: "Seri Living MY", type: "Referral", amount: 50, source: "Referral R-903: Kopi Senja qualified", expires: "28 Dec", by: "System" },
  { id: "L-88204", when: "28 Oct 08:12", account: "@mei.ling.deals", type: "Spend", amount: -12, source: "AI script generation", expires: "—", by: "System" },
  { id: "L-88201", when: "27 Oct 21:10", account: "@farah.home", type: "Grant", amount: 50, source: "Mission: Run your first scan v1", expires: "27 Nov", by: "System" },
  { id: "L-88190", when: "27 Oct 18:44", account: "@zara.home", type: "Refund", amount: 12, source: "Generation failed, credits returned", expires: "—", by: "System" },
  { id: "L-88172", when: "27 Oct 15:31", account: "@danial.reviews", type: "Reverse", amount: -100, source: "Referral R-907: same TikTok account", expires: "—", by: "Farid · duplicate account" },
  { id: "L-88150", when: "26 Oct 21:10", account: "@aisyah.glow", type: "Grant", amount: 60, source: "Mission: Post today v2 (tier 5)", expires: "26 Nov", by: "System" },
  { id: "L-88131", when: "25 Oct 09:00", account: "@nurul.beauty", type: "Adjust", amount: 200, source: "Make-good: publishing outage 24 Oct", expires: "25 Dec", by: "Aina · approved by Farid", status: "Approved" },
  { id: "L-88120", when: "24 Oct 15:12", account: "Urban Basics MY", type: "Grant", amount: 150, source: "Mission: Submit your first products v1", expires: "24 Dec", by: "System" },
];
export const PENDING_ADJ = [
  { id: "ADJ-061", account: "@mei.ling.deals", amount: 300, reason: "LIVE session make-good (CS-038)", by: "Farid", when: "28 Oct 09:58" },
];

export const RECON = [
  { day: "28 Oct", issued: 4120, used: 1830, referral: 600, ledger: 1218450, wallets: 1218450, partnerOurs: 6210.4, partnerTikTok: 6210.4, note: "Today so far" },
  { day: "27 Oct", issued: 18940, used: 7210, referral: 1400, ledger: 1215960, wallets: 1216080, partnerOurs: 14820.2, partnerTikTok: 14820.2, note: "2 referral rewards in wallets but not in the ledger (R-905, R-907 held)" },
  { day: "26 Oct", issued: 17620, used: 6980, referral: 1200, ledger: 1203630, wallets: 1203630, partnerOurs: 13910.6, partnerTikTok: 13869.4, note: "TikTok counted 3 late cancellations we haven't re-read yet" },
  { day: "25 Oct", issued: 16210, used: 7020, referral: 900, ledger: 1191790, wallets: 1191790, partnerOurs: 12980.1, partnerTikTok: 12980.1, note: "" },
  { day: "24 Oct", issued: 15880, used: 6410, referral: 1100, ledger: 1181700, wallets: 1181700, partnerOurs: 12110.9, partnerTikTok: 12110.9, note: "" },
  { day: "23 Oct", issued: 14920, used: 6880, referral: 700, ledger: 1171130, wallets: 1171130, partnerOurs: 11640.0, partnerTikTok: 11640.0, note: "" },
  { day: "22 Oct", issued: 15400, used: 7190, referral: 800, ledger: 1162390, wallets: 1162390, partnerOurs: 11220.3, partnerTikTok: 11220.3, note: "" },
];

/* ---------------- Analytics ---------------- */

export const FUNNEL = {
  Creators: [["Visited the site", 48200], ["Signed up", 6120], ["Linked TikTok Shop", 3940], ["First scan", 3410], ["Added a raise", 1880], ["Raise confirmed by TikTok", 1420]] as [string, number][],
  Sellers: [["Visited the site", 6400], ["Signed up", 610], ["Connected shop", 402], ["Submitted products", 288], ["Campaign live", 196], ["First collaboration done", 121]] as [string, number][],
};
export const DAYS14 = ["15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28"];
export const EVENTS: Record<string, number[]> = {
  "Sign-ups": [31, 28, 40, 36, 44, 52, 38, 41, 47, 50, 39, 45, 49, 44],
  Scans: [210, 198, 240, 251, 266, 301, 280, 275, 290, 318, 300, 296, 330, 312],
  "Raises added": [42, 38, 51, 47, 55, 61, 58, 52, 60, 66, 63, 59, 70, 57],
  "Posts published": [610, 588, 640, 702, 690, 744, 720, 698, 760, 802, 790, 770, 830, 640],
  "Sample requests": [18, 22, 25, 19, 27, 31, 24, 26, 30, 29, 33, 28, 35, 13],
};
export const TIMELINES: Record<string, { when: string; what: string; tone?: "ok" | "warn" | "bad" }[]> = {
  "@farah.home": [
    { when: "28 Oct 09:10", what: "Posted 2 videos (TikTok, Instagram)", tone: "ok" },
    { when: "27 Oct 21:10", what: "Mission claimed: Run your first scan (+50)" },
    { when: "27 Oct 21:02", what: "Scan finished: 3 better rates found" },
    { when: "27 Oct 20:58", what: "Started a scan of 412 showcase products" },
    { when: "26 Oct 13:20", what: "Sample request SR-222 (capsule spin chopper)" },
    { when: "24 Oct 11:00", what: "Verified WhatsApp" },
    { when: "21 Oct 10:15", what: "Linked TikTok Shop", tone: "ok" },
    { when: "20 Oct 22:41", what: "Signed up from @aisyah.glow's invite link" },
  ],
  "@zara.home": [
    { when: "28 Oct 08:00", what: "Overdue reminder sent (cordless vacuum, day 3)", tone: "bad" },
    { when: "25 Oct 08:00", what: "Sample due: cordless vacuum, no video posted", tone: "warn" },
    { when: "19 Oct 14:40", what: "Sample received (cordless vacuum)" },
    { when: "18 Oct 16:02", what: "Raise confirmed: 4-in-1 cable 12% → 20%", tone: "ok" },
  ],
  "Seri Living MY": [
    { when: "28 Oct 09:41", what: "Submitted 2 products from the KL Expo QR (TAP-0418)" },
    { when: "28 Oct 09:30", what: "Referral reward: Kopi Senja qualified (+50)", tone: "ok" },
    { when: "27 Oct 18:00", what: "Viewed TAP performance (Last 30 days)" },
    { when: "24 Oct 10:12", what: "Agreed to sample terms v2", tone: "ok" },
  ],
};

/* ---------------- Support ---------------- */

export type DisputeStatus = "Open" | "Waiting on creator" | "Waiting on seller" | "Resolved";
export const DISPUTES: { id: string; kind: "Sample not received" | "Creator overdue" | "Seller complaint"; title: string; creator: string; seller: string; opened: string; status: DisputeStatus; owner: string | null; due: string; late?: boolean; log: { when: string; who: string; text: string }[] }[] = [
  { id: "D-118", kind: "Creator overdue", title: "Cordless vacuum: no video yet, 3 days late", creator: "@zara.home", seller: "Seri Living MY", opened: "25 Oct", status: "Waiting on creator", owner: "Aina", due: "Today", late: true, log: [{ when: "25 Oct 08:00", who: "System", text: "Due date passed with no video." }, { when: "26 Oct 10:12", who: "Aina", text: "Reminded on WhatsApp. She says her first video is being edited." }, { when: "28 Oct 08:00", who: "System", text: "Day 3 overdue. Samples paused for her." }] },
  { id: "D-117", kind: "Sample not received", title: "Spin chopper shows Delivered, creator says no parcel", creator: "@aisyah.glow", seller: "Seri Living MY", opened: "27 Oct", status: "Waiting on seller", owner: "Kumar", due: "30 Oct", log: [{ when: "27 Oct 14:22", who: "@aisyah.glow", text: "TikTok says delivered on 25 Oct but nothing arrived. Guardhouse checked." }, { when: "27 Oct 15:01", who: "Kumar", text: "Asked Seri Living to check the courier's proof of delivery." }] },
  { id: "D-116", kind: "Seller complaint", title: "Creator used a different product in the video", creator: "@siti.deco", seller: "Lena Home", opened: "26 Oct", status: "Open", owner: null, due: "29 Oct", log: [{ when: "26 Oct 19:40", who: "Lena Home", text: "Her video shows another brand's pillowcase with our product in the cart." }] },
  { id: "D-114", kind: "Creator overdue", title: "Yoga pants: no video yet, 1 day late", creator: "@ahmad.fitlife", seller: "Urban Basics MY", opened: "27 Oct", status: "Waiting on creator", owner: "Aina", due: "29 Oct", log: [{ when: "27 Oct 08:00", who: "System", text: "Due date passed with no video." }] },
  { id: "D-109", kind: "Sample not received", title: "Thermos parcel returned to seller", creator: "@mei.ling.deals", seller: "Seri Living MY", opened: "20 Oct", status: "Resolved", owner: "Kumar", due: "—", log: [{ when: "20 Oct 11:00", who: "@mei.ling.deals", text: "Parcel shows Returned." }, { when: "22 Oct 09:30", who: "Kumar", text: "Seller re-sent. Received 24 Oct. Closed." }] },
];

export type FbType = "Idea" | "Bug" | "Complaint";
export type FbStatus = "New" | "In progress" | "Handled" | "Won't do";
export const FEEDBACK: { id: string; from: string; role: "Creator" | "Seller"; type: FbType; text: string; page: string; device: string; when: string; status: FbStatus }[] = [
  { id: "FB-301", from: "@farah.home", role: "Creator", type: "Idea", text: "Can the scan results show which raises are ending soon first?", page: "/app#scan", device: "iPhone 13 · Safari", when: "Today 10:12", status: "New" },
  { id: "FB-300", from: "Seri Living MY", role: "Seller", type: "Bug", text: "The chart on TAP performance shows yesterday as zero.", page: "/seller/app/results", device: "Windows · Chrome", when: "Today 09:40", status: "New" },
  { id: "FB-299", from: "@hafiz.tech", role: "Creator", type: "Complaint", text: "I linked TikTok Shop 6 days ago and I'm still waiting for approval.", page: "/app", device: "Android · TikTok in-app", when: "Today 08:55", status: "New" },
  { id: "FB-298", from: "@nurul.beauty", role: "Creator", type: "Idea", text: "Please add Bahasa Melayu to the app.", page: "/app/rewards", device: "Android · Chrome", when: "Yesterday", status: "New" },
  { id: "FB-297", from: "Mawar Wear", role: "Seller", type: "Bug", text: "Upload of the product photo failed twice on Wi-Fi.", page: "/seller/app/submit", device: "iPad · Safari", when: "Yesterday", status: "In progress" },
  { id: "FB-296", from: "@kak.ros.kitchen", role: "Creator", type: "Idea", text: "A reminder the day before a sample video is due would help.", page: "/app/account#samples", device: "iPhone 15 · Safari", when: "26 Oct", status: "New" },
  { id: "FB-295", from: "Bersih Pro", role: "Seller", type: "Complaint", text: "Two creators haven't posted for our samples.", page: "/seller/app/results/samples", device: "Windows · Edge", when: "25 Oct", status: "Handled" },
];

/* ---------------- System ---------------- */

export const FLAGS = [
  { key: "rewards", label: "Missions, rewards and wallet", note: "Creators and sellers", on: true },
  { key: "ai_picks", label: "AI picks", note: "On every creator's home", on: true },
  { key: "publish_tiktok", label: "Publish to TikTok (public)", note: "Waiting for TikTok's review; drafts only until then", on: false },
  { key: "competitors", label: "AI competitors for sellers", note: "Reads TikTok's public top lists", on: true },
  { key: "ai_create", label: "AI script and prompt tools", note: "Phase 2", on: false },
  { key: "creator_search", label: "Creator search for sellers", note: "Phase 2, when the creator pool is big enough", on: false },
];

export const FAILED_POSTS = [
  { id: "PB-7781", who: "@aisyah.glow", role: "Creator", platform: "Threads", caption: "Toilet cleaner, honest review", when: "Yesterday 21:10", error: "Account needs reconnecting", attempts: 3, retry: false },
  { id: "PB-7779", who: "@mei.ling.deals", role: "Creator", platform: "Instagram", caption: "5 ways to style wide pants", when: "Yesterday 19:02", error: "Instagram: rate limit, try later", attempts: 1, retry: true },
  { id: "PB-7774", who: "Seri Living MY", role: "Seller", platform: "Facebook", caption: "11.11 thermos bundle", when: "Yesterday 12:30", error: "Facebook Page permission removed", attempts: 2, retry: false },
  { id: "PB-7770", who: "@kak.ros.kitchen", role: "Creator", platform: "TikTok", caption: "Casserole pot: one-pot rendang", when: "27 Oct 20:00", error: "TikTok: video still processing", attempts: 1, retry: true },
  { id: "PB-7768", who: "@nurul.beauty", role: "Creator", platform: "Instagram", caption: "Jersey in 6 colours", when: "27 Oct 18:45", error: "Video longer than 90 s for Reels", attempts: 1, retry: false },
  { id: "PB-7761", who: "Urban Basics MY", role: "Seller", platform: "TikTok", caption: "Track pants restock", when: "27 Oct 11:00", error: "TikTok: upload timed out", attempts: 2, retry: true },
];

export type Audit = { id: string; when: string; who: string; role: Role | "System"; action: string; target: string; before: string; after: string };
export const AUDIT: Audit[] = [
  { id: "A-55210", when: "28 Oct 10:31", who: "Priya", role: "Growth", action: "Mission scheduled", target: "Post today", before: "v2 live", after: "v3 from 1 Nov 00:00" },
  { id: "A-55207", when: "28 Oct 10:05", who: "Kumar", role: "Ops", action: "Disagreed with system", target: "SR-219 @siti.deco", before: "Suggest reject", after: "Approved · Seller asked" },
  { id: "A-55204", when: "28 Oct 09:58", who: "Farid", role: "Finance", action: "Credit adjustment requested", target: "@mei.ling.deals", before: "1,420", after: "1,720 (waiting for approval)" },
  { id: "A-55199", when: "28 Oct 09:40", who: "Hazwan", role: "Super Admin", action: "Admin Access granted", target: "nadia@rezekii.com", before: "No access", after: "Business" },
  { id: "A-55190", when: "28 Oct 09:12", who: "Aina", role: "Ops", action: "Marked done by hand", target: "TAP-0380 · Auto-extend", before: "Waiting for a person", after: "Done · record 1730 3910 2290" },
  { id: "A-55181", when: "28 Oct 08:00", who: "System", role: "System", action: "Samples paused", target: "@zara.home", before: "Samples allowed", after: "Paused (overdue 3 days)" },
  { id: "A-55170", when: "27 Oct 18:22", who: "Aina", role: "Ops", action: "Creator marked Gold", target: "@kak.ros.kitchen", before: "Silver", after: "Gold · 1 Oct 2026 – 31 Mar 2027" },
  { id: "A-55162", when: "27 Oct 15:31", who: "Farid", role: "Finance", action: "Referral reward reversed", target: "R-907 @danial.reviews", before: "+50", after: "0 · same TikTok account" },
  { id: "A-55150", when: "27 Oct 11:02", who: "Hazwan", role: "Super Admin", action: "Setting changed", target: "Sample quantity presets", before: "30 / 50", after: "30 / 40 / 50" },
  { id: "A-55141", when: "26 Oct 16:44", who: "Aina", role: "Ops", action: "Review passed", target: "TAP-0409 Mawar Wear", before: "In review", after: "To submit" },
];

/** Consent records: who agreed to which Terms and Privacy versions before linking, the TikTok permissions granted, and what happened since. Kept as evidence. */
export type ConsentRow = {
  id: string; who: string; role: "Creator" | "Seller"; at: string; terms: string; privacy: string; scopes: number; ip: string; device: string; grant: string;
  status: "Active" | "Unlinked" | "Deleted"; events: [string, string][];
};
export const CONSENTS: ConsentRow[] = [
  { id: "C-30418", who: "@aisyah.glow", role: "Creator", at: "3 Mar 2026 22:24", terms: "1.0", privacy: "1.0", scopes: 5, ip: "175.139.xx.xx", device: "iPhone 15 · Safari", grant: "tts-gr-8f21…c04", status: "Active", events: [["3 Mar 22:24", "Agreed and linked TikTok Shop"], ["28 Oct 09:12", "Data read for daily scan"]] },
  { id: "C-30415", who: "Seri Living MY", role: "Seller", at: "12 Jan 2026 10:02", terms: "1.0", privacy: "1.0", scopes: 3, ip: "60.48.xx.xx", device: "Windows · Chrome", grant: "tts-gr-71aa…9e2", status: "Active", events: [["12 Jan 10:02", "Agreed and connected Seller Center"], ["27 Oct 16:40", "Products read for TAP submission"]] },
  { id: "C-30409", who: "@mei.ling.deals", role: "Creator", at: "2 Apr 2026 14:55", terms: "1.0", privacy: "1.0", scopes: 5, ip: "113.211.xx.xx", device: "Android · Chrome", grant: "tts-gr-0c9d…b17", status: "Active", events: [["2 Apr 14:55", "Agreed and linked TikTok Shop"]] },
  { id: "C-30396", who: "@danial.reviews", role: "Creator", at: "18 Jun 2026 09:20", terms: "1.0", privacy: "1.0", scopes: 5, ip: "202.188.xx.xx", device: "iPhone 13 · Safari", grant: "tts-gr-55b3…e80", status: "Unlinked", events: [["18 Jun 09:20", "Agreed and linked TikTok Shop"], ["20 Oct 21:14", "Unlinked in My account · reading stopped"], ["19 Nov", "Data deletion due"]] },
  { id: "C-30388", who: "Volt Gadget", role: "Seller", at: "5 May 2026 11:48", terms: "1.0", privacy: "1.0", scopes: 3, ip: "115.132.xx.xx", device: "macOS · Safari", grant: "tts-gr-9de0…a31", status: "Active", events: [["5 May 11:48", "Agreed and connected Seller Center"]] },
  { id: "C-30361", who: "@zara.home", role: "Creator", at: "9 Feb 2026 20:31", terms: "1.0", privacy: "1.0", scopes: 5, ip: "175.143.xx.xx", device: "Android · Chrome", grant: "tts-gr-2a7f…d55", status: "Deleted", events: [["9 Feb 20:31", "Agreed and linked TikTok Shop"], ["14 Aug 08:02", "Account deleted by the creator · reading stopped"], ["12 Sep 03:00", "TikTok Shop data deleted · record kept"]] },
];
