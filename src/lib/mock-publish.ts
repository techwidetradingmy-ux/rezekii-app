/**
 * Sample channels and brands for New post (creator and seller), following V1's composer. Invented accounts; nothing is
 * connected or sent anywhere.
 */
import type { Channel } from "@/components/publish/rules";
import { CREATOR } from "./mock";
import { SELLER_CREDITS } from "./mock-seller";

/** Cross-channel posting costs credits per channel (owner, 28 Oct 2026). Admin can change it. */
export const POST_CREDITS = 5;

/**
 * `role` and `shopId`: a Shopee account (owner, 21 Nov 2026): a shop shows its own products under its videos, an affiliate none.
 * `photo`: the account's profile picture (owner, 22 Nov 2026); initials show without one.
 */
export type PubChannel = { key: string; app: Channel; name: string; sub: string; initials: string; color: string; status: "active" | "reconnect"; role?: "seller" | "affiliate"; shopId?: string | null; photo?: string | null };
export type PubBrand = { id: string; name: string; channels: string[] };
export type PublishSetup = {
  /** Shown as the account in the phone previews. */
  channels: PubChannel[];
  /** Shopee can be connected (its app keys are set on this site). */
  shopeeOn?: boolean;
  brands: PubBrand[];
  /** Channels of the last post, for "Same as last post". */
  last: string[];
  /** Apps that can still be connected (the "+ Threads" chips). */
  connectable: PubChannel[];
  /** The post Rezekii suggests: no link or call to action in the caption; those go in the first comment. */
  sample: { main: string; tags: string; link: string; cta: string; comment: string; cover: string; file: string; seconds: number };
  calendar: string;
  /** TikTok's video pre-check (creator API: violations and quality before posting). */
  precheck?: boolean;
  /** Wallet balance, and where to earn more credits. */
  credits: number;
  /** Posting costs nothing for this account (Admins and the accounts Meta reviews with). */
  free?: boolean;
  earn: string;
  /** Signed in (owner, 31 Oct 2026): her real channels, posts go out for real, from this wallet. */
  live?: "creator" | "seller";
};

const ch = (key: string, app: Channel, name: string, sub: string, initials: string, color: string, status: PubChannel["status"] = "active"): PubChannel => ({ key, app, name, sub, initials, color, status });

export const CREATOR_SETUP: PublishSetup = {
  channels: [
    ch("tt-aisyah", "tiktok", "@aisyah.glow", "TikTok", "AR", "#00a862"),
    ch("fb-aisyah", "facebook", "Aisyah Glow", "Facebook Page", "AG", "#1877f2"),
    ch("ig-aisyah", "instagram", "Aisyah Glow", "@aisyah.glow", "AR", "#e1306c"),
  ],
  brands: [{ id: "b1", name: "Aisyah Glow", channels: ["tt-aisyah", "fb-aisyah", "ig-aisyah"] }],
  last: ["tt-aisyah", "ig-aisyah", "fb-aisyah"],
  connectable: [ch("th-aisyah", "threads", "Aisyah Glow", "@aisyah.glow", "AR", "#111111")],
  sample: {
    main: "Thermos test part 3: is coffee still hot after 12 hours?\nI tried it on a full work day, 7am to 7pm.\nStill hot enough to sip at 7pm ☕",
    tags: "#thermos #kopi #tiktokshopmy",
    link: "https://vt.tiktok.com/ZSthermos/",
    cta: "Dapatkan di sini 👉",
    comment: "Saya guna yang 1.2L, warna hitam.",
    cover: "/products/tap-21.jpg",
    file: "thermos-part3.mp4",
    seconds: 42,
  },
  calendar: "/app/publish/calendar",
  precheck: true,
  credits: CREATOR.credits,
  earn: "/app/rewards",
};

export const SELLER_SETUP: PublishSetup = {
  channels: [
    ch("tt-seri", "tiktok", "@seriliving.my", "TikTok", "SL", "#00a862"),
    ch("fb-seri", "facebook", "Seri Living MY", "Facebook Page", "SL", "#1877f2"),
    ch("fb-outlet", "facebook", "Seri Living Outlet", "Facebook Page", "SO", "#3b5ba9"),
    ch("ig-seri", "instagram", "Seri Living MY", "@seriliving.my", "SL", "#e1306c"),
    ch("ig-deals", "instagram", "Seri Living Deals", "@seriliving.deals", "SD", "#c13584", "reconnect"),
    ch("th-seri", "threads", "Seri Living MY", "@seriliving.my", "SL", "#111111"),
  ],
  brands: [
    { id: "b1", name: "Seri Living MY", channels: ["tt-seri", "fb-seri", "ig-seri", "th-seri"] },
    { id: "b2", name: "Seri Living Outlet", channels: ["fb-outlet", "ig-deals"] },
  ],
  last: ["fb-seri", "ig-seri", "th-seri"],
  connectable: [],
  sample: {
    main: "Chopper vs knife: 1 kg onions in 30 seconds.\nNo more crying in the kitchen 🧅",
    tags: "#dapur #chopper #tiktokshopmy",
    link: "https://vt.tiktok.com/ZSchopper/",
    cta: "Dapatkan di sini 👉",
    comment: "Ada soalan? Tanya di komen 👇",
    cover: "/products/tap-11.jpg",
    file: "chopper-onions.mp4",
    seconds: 34,
  },
  calendar: "/seller/app/publish/calendar",
  credits: SELLER_CREDITS,
  earn: "/seller/app/rewards",
};

/* ---------------- Content calendar ---------------- */

/** One channel's state, V1's live statuses: Draft → Scheduled → Uploading → Sending/Publishing → Processing → Posted. */
export type PostStatus = "draft" | "scheduled" | "uploading" | "sending" | "processing" | "posted" | "inbox" | "failed" | "removed" | "pagedraft";
export type PostTarget = {
  key: string; status: PostStatus; reason?: string; fix?: "Retry" | "Reconnect"; views?: number;
  /** A real post: this channel's own post id, whether it can still be cancelled, and its link once posted. */
  postId?: string; canCancel?: boolean; permalink?: string | null;
  /** Posted, but its first comment didn't go: `reason` says why, and she can send the comment again. */
  commentFailed?: boolean;
};
export type MyPost = {
  id: string;
  /** Her real post's video or first photo, loaded when it scrolls into view (owner, 23 Nov 2026). */
  preview?: { url: string; type: "video" | "photo" } | null;
  /** ISO date and 24-hour time, Malaysia time; empty for a draft with no time yet. */
  date: string;
  time: string;
  caption: string;
  comment: string;
  cover: string;
  seconds: number;
  targets: PostTarget[];
  /** Posted from her phone in the app itself (owner, 28 Oct 2026). Rezekii reads these from each connected account; missing = posted with Rezekii. */
  source?: "phone";
  /** One of her real posts (signed in). */
  real?: boolean;
};

const tg = (key: string, status: PostStatus, more: Partial<PostTarget> = {}): PostTarget => ({ key, status, ...more });
const CMT = "Dapatkan di sini 👉 https://vt.tiktok.com/ZS";

export const CREATOR_POSTS: MyPost[] = [
  { id: "m1", date: "2026-10-28", time: "09:15", caption: "Morning kopi test: thermos vs mug", comment: `${CMT}thermos/`, cover: "/products/tap-21.jpg", seconds: 38, targets: [tg("tt-aisyah", "uploading"), tg("fb-aisyah", "uploading"), tg("ig-aisyah", "scheduled")] },
  { id: "m2", date: "2026-10-28", time: "20:00", caption: "Thermos test part 2: 48 hours", comment: `${CMT}thermos/`, cover: "/products/tap-21.jpg", seconds: 44, targets: [tg("tt-aisyah", "scheduled"), tg("ig-aisyah", "scheduled"), tg("fb-aisyah", "scheduled")] },
  { id: "m3", date: "2026-10-29", time: "12:30", caption: "3 cables I actually use", comment: `${CMT}cable/`, cover: "/products/tap-13.jpg", seconds: 29, targets: [tg("tt-aisyah", "scheduled"), tg("ig-aisyah", "scheduled")] },
  { id: "m4", date: "2026-10-30", time: "21:00", caption: "Office look part 2", comment: `${CMT}office/`, cover: "/products/tap-09.jpg", seconds: 33, targets: [tg("tt-aisyah", "scheduled"), tg("ig-aisyah", "scheduled"), tg("fb-aisyah", "scheduled")] },
  { id: "m5", date: "2026-11-01", time: "11:00", caption: "Weekend picnic with the thermos", comment: `${CMT}thermos/`, cover: "/products/tap-21.jpg", seconds: 41, targets: [tg("tt-aisyah", "scheduled"), tg("fb-aisyah", "scheduled")] },
  { id: "m6", date: "2026-11-03", time: "20:00", caption: "Windbreaker in real rain", comment: `${CMT}jacket/`, cover: "/products/tap-03.jpg", seconds: 36, targets: [tg("tt-aisyah", "scheduled"), tg("ig-aisyah", "scheduled")] },
  { id: "m7", date: "", time: "", caption: "Slim pants: 3 ways to wear them", comment: "", cover: "/products/tap-07.jpg", seconds: 31, targets: [tg("tt-aisyah", "draft"), tg("ig-aisyah", "draft")] },
  { id: "m8", date: "2026-10-27", time: "21:10", caption: "Toilet cleaner, honest review", comment: `${CMT}cleaner/`, cover: "/products/tap-22.jpg", seconds: 47, targets: [tg("tt-aisyah", "posted", { views: 12300 }), tg("fb-aisyah", "posted", { views: 1840 }), tg("ig-aisyah", "failed", { reason: "Instagram stopped accepting posts from Rezekii", fix: "Reconnect" })] },
  { id: "m9", date: "2026-10-26", time: "20:15", caption: "Yoga pants fit check", comment: `${CMT}yoga/`, cover: "/products/tap-05.jpg", seconds: 52, targets: [tg("tt-aisyah", "posted", { views: 8400 }), tg("fb-aisyah", "failed", { reason: "Facebook was busy and didn't answer", fix: "Retry" })] },
  { id: "m10", date: "2026-10-25", time: "13:00", caption: "Pillowcase colours ranked", comment: "", cover: "/products/tap-17.jpg", seconds: 27, targets: [tg("tt-aisyah", "inbox")] },
  { id: "m11", date: "2026-10-24", time: "20:30", caption: "Thermos vs a cheap flask", comment: `${CMT}thermos/`, cover: "/products/tap-21.jpg", seconds: 39, targets: [tg("tt-aisyah", "posted", { views: 41200 }), tg("ig-aisyah", "posted", { views: 5100 }), tg("fb-aisyah", "posted", { views: 2300 })] },
  { id: "m13", date: "2026-10-27", time: "13:20", caption: "GRWM before the office", comment: "", cover: "/products/tap-09.jpg", seconds: 24, source: "phone", targets: [tg("tt-aisyah", "posted", { views: 6200 })] },
  { id: "m14", date: "2026-10-25", time: "21:40", caption: "Thermos refill hack", comment: "", cover: "/products/tap-21.jpg", seconds: 18, source: "phone", targets: [tg("ig-aisyah", "posted", { views: 2100 })] },
  { id: "m15", date: "2026-10-23", time: "08:05", caption: "Rain check: windbreaker on the way to work", comment: "", cover: "/products/tap-03.jpg", seconds: 21, source: "phone", targets: [tg("tt-aisyah", "posted", { views: 3300 })] },
  { id: "m12", date: "2026-10-22", time: "21:00", caption: "One cable, four phones", comment: `${CMT}cable/`, cover: "/products/tap-13.jpg", seconds: 25, targets: [tg("tt-aisyah", "posted", { views: 9800 }), tg("ig-aisyah", "posted", { views: 1200 })] },
];

export const SELLER_POSTS_V2: MyPost[] = [
  { id: "s1", date: "2026-10-28", time: "09:15", caption: "Chopper vs knife, part 2", comment: `${CMT}chopper/`, cover: "/products/tap-11.jpg", seconds: 34, targets: [tg("tt-seri", "uploading"), tg("fb-seri", "uploading"), tg("th-seri", "scheduled")] },
  { id: "s2", date: "2026-10-28", time: "20:00", caption: "Thermos test: hot kopi at 7 AM, still hot at 3 PM", comment: `${CMT}thermos/`, cover: "/products/tap-21.jpg", seconds: 40, targets: [tg("fb-seri", "scheduled"), tg("ig-seri", "scheduled")] },
  { id: "s3", date: "2026-10-30", time: "12:30", caption: "Weekend rendang in the granite pot", comment: `${CMT}pot/`, cover: "/products/tap-08.jpg", seconds: 45, targets: [tg("fb-seri", "scheduled"), tg("fb-outlet", "scheduled"), tg("ig-seri", "scheduled")] },
  { id: "s4", date: "2026-11-01", time: "09:00", caption: "Tumbler colours for school, 6 to pick", comment: `${CMT}tumbler/`, cover: "/products/tap-24.jpg", seconds: 22, targets: [tg("ig-seri", "scheduled"), tg("th-seri", "scheduled")] },
  { id: "s5", date: "", time: "", caption: "Open house set: pot + thermos", comment: "", cover: "/products/tap-08.jpg", seconds: 30, targets: [tg("fb-seri", "draft")] },
  { id: "s6", date: "2026-10-27", time: "20:00", caption: "Chopper vs knife: 1 kg onions", comment: `${CMT}chopper/`, cover: "/products/tap-11.jpg", seconds: 34, targets: [tg("fb-seri", "posted", { views: 6300 }), tg("ig-seri", "posted", { views: 3900 }), tg("ig-deals", "failed", { reason: "Instagram stopped accepting posts from Rezekii", fix: "Reconnect" })] },
  { id: "s7", date: "2026-10-24", time: "19:45", caption: "Cordless vacuum: pet hair in one pass", comment: `${CMT}vacuum/`, cover: "/products/tap-18.jpg", seconds: 37, targets: [tg("tt-seri", "posted", { views: 22100 }), tg("fb-seri", "posted", { views: 2700 })] },
  { id: "s9", date: "2026-10-26", time: "11:30", caption: "Restock day at the warehouse", comment: "", cover: "/products/tap-18.jpg", seconds: 19, source: "phone", targets: [tg("tt-seri", "posted", { views: 4100 })] },
  { id: "s10", date: "2026-10-23", time: "16:10", caption: "Tumbler colours, quick look", comment: "", cover: "/products/tap-24.jpg", seconds: 15, source: "phone", targets: [tg("ig-seri", "posted", { views: 1500 })] },
  { id: "s8", date: "2026-10-21", time: "20:00", caption: "Granite pot: first cook", comment: `${CMT}pot/`, cover: "/products/tap-08.jpg", seconds: 42, targets: [tg("fb-seri", "posted", { views: 1900 }), tg("th-seri", "posted", { views: 640 })] },
];
