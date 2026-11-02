import { tx } from "@/lib/i18n/lang";

/**
 * AI Video waitlist (owner, 29 Oct 2026): the tool isn't launched. Creators join a waitlist; the people on it become the first
 * trial batch at launch. Sample data only.
 */
export const VIDEO_TYPES = ["Product demos", "Try-ons", "Reviews", "Expert advice", "Mini dramas", "Unboxings", "Before & after"] as const;
export const PLATFORMS = ["TikTok", "Instagram", "Facebook", "Threads"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];
/** Each kind of video as she reads it, translated where it's shown; the English above is what's saved (owner, 3 Nov 2026). */
export const VIDEO_TYPE_LABEL: Record<VideoType, string> = {
  "Product demos": tx("Product demos"), "Try-ons": tx("Try-ons"), Reviews: tx("Reviews"), "Expert advice": tx("Expert advice"),
  "Mini dramas": tx("Mini dramas"), Unboxings: tx("Unboxings"), "Before & after": tx("Before & after"),
};

/** Videos our team already made with AI, cut to 15 seconds (owner, 29 Oct 2026), so she sees what to expect before it launches. */
export const AI_EXAMPLES: { id: string; type: VideoType; product: string }[] = [
  { id: "try-on", type: "Try-ons", product: "Loose-cut denim pants" },
  { id: "pov-demo", type: "Product demos", product: "Car floor mat" },
  { id: "review", type: "Reviews", product: "Face ampoule" },
  { id: "expert", type: "Expert advice", product: "Daily supplement" },
  { id: "drama", type: "Mini dramas", product: "Krill oil" },
  { id: "home-demo", type: "Product demos", product: "Walking pad" },
];

/** Her answers on the creator page. */
export type WaitlistAnswers = { types: VideoType[]; videos: number; platforms: Platform[]; note?: string };
export type WaitlistEntry = WaitlistAnswers & { id: string; handle: string; joined: string; niche: string; gmv30: number; picked: boolean };

/** Her place in the queue once she joins (sample). */
export const MY_SPOT = 128;
/** How many creators get into the first trial batch. */
export const TRIAL_SIZE = 20;

export const WAITLIST: WaitlistEntry[] = [
  { id: "w1", handle: "@nurul.beauty", joined: "2026-10-29", niche: "Beauty", types: ["Reviews", "Before & after"], videos: 30, platforms: ["TikTok", "Instagram"], gmv30: 18420, picked: true, note: "Malay voice-over please" },
  { id: "w2", handle: "@dapurkakmah", joined: "2026-10-29", niche: "Home & Kitchen", types: ["Product demos", "Unboxings"], videos: 20, platforms: ["TikTok", "Facebook"], gmv30: 9310, picked: false },
  { id: "w3", handle: "@hafiz.techreview", joined: "2026-10-28", niche: "Gadgets", types: ["Unboxings", "Reviews", "Product demos"], videos: 24, platforms: ["TikTok", "Instagram", "Threads"], gmv30: 22750, picked: true },
  { id: "w4", handle: "@ootd.with.mira", joined: "2026-10-28", niche: "Fashion", types: ["Try-ons"], videos: 40, platforms: ["TikTok", "Instagram"], gmv30: 14980, picked: false, note: "Mostly hijab and baju kurung" },
  { id: "w5", handle: "@mamaaqil.picks", joined: "2026-10-27", niche: "Mom & Baby", types: ["Reviews", "Unboxings"], videos: 12, platforms: ["TikTok", "Facebook"], gmv30: 6240, picked: false },
  { id: "w6", handle: "@sihat.ala.siti", joined: "2026-10-27", niche: "Health", types: ["Reviews", "Before & after"], videos: 16, platforms: ["TikTok"], gmv30: 11630, picked: true },
  { id: "w7", handle: "@gym.bro.amir", joined: "2026-10-26", niche: "Sports", types: ["Product demos", "Before & after"], videos: 8, platforms: ["TikTok", "Instagram"], gmv30: 3870, picked: false },
  { id: "w8", handle: "@kedai.rumah.lina", joined: "2026-10-25", niche: "Home & Kitchen", types: ["Product demos"], videos: 10, platforms: ["TikTok", "Facebook", "Threads"], gmv30: 7520, picked: false, note: "Short ones, under 20 seconds" },
  { id: "w9", handle: "@skincare.sarah", joined: "2026-10-24", niche: "Beauty", types: ["Reviews", "Try-ons", "Before & after"], videos: 28, platforms: ["TikTok", "Instagram", "Threads"], gmv30: 25110, picked: true },
  { id: "w10", handle: "@petpals.my", joined: "2026-10-22", niche: "Pets", types: ["Unboxings", "Product demos"], videos: 6, platforms: ["TikTok"], gmv30: 2140, picked: false },
];

export const joinedText = (iso: string) => new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
