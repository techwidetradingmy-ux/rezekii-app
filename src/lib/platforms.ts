import { tx } from "./i18n/lang.ts";

/**
 * Which apps anyone can connect and post to. All open (owner, 21 Nov 2026): Meta approved Facebook Page, Instagram and Threads
 * on 9 Nov 2026 and TikTok approved Content Posting (Direct Post) on 20 Nov 2026. A closed one's Connect button reads Not
 * Available Yet and its missions are hidden; Admins can still connect and post, and anyone already connected can reconnect.
 */
export type Network = "tiktok" | "facebook" | "instagram" | "threads" | "shopee";
export const OPEN: Record<Network, boolean> = { tiktok: true, facebook: true, instagram: true, threads: true, shopee: true };
/** Posting to TikTok through Rezekii (TikTok's Content Posting review, approved 20 Nov 2026). */
export const TIKTOK_POSTING = true;

/** Why a closed one can't be used yet, for its tip. */
export const WAITING: Record<Network, string> = {
  tiktok: tx("Posting to TikTok is waiting for TikTok's approval. Coming soon."),
  facebook: tx("Waiting for Meta's approval. Coming soon."),
  instagram: tx("Waiting for Meta's approval. Coming soon."),
  threads: tx("Waiting for Meta's approval. Coming soon."),
  shopee: tx("Coming soon."),
};

/** Whether this person may start connecting it: open to everyone, or she's an admin. */
export const canConnect = (app: Network, admin = false) => OPEN[app] || admin;
/** Whether this person may post to it through Rezekii. */
export const canPost = (app: Network, admin = false) => (app === "tiktok" ? TIKTOK_POSTING && OPEN.tiktok : OPEN[app]) || admin;
/** Whether any of Facebook, Instagram or Threads is open. */
export const metaOpen = () => OPEN.facebook || OPEN.instagram || OPEN.threads;
