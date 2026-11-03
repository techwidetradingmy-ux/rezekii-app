import { tx } from "./i18n/lang.ts";

/**
 * Which apps anyone can connect and post to (owner, 3 Nov 2026). Meta's app (Facebook Page, Instagram, Threads) only lets in
 * the testers added there until Meta approves Rezekii, so until then their Connect buttons read Not Available Yet. TikTok sign-in
 * and linking are fine; only posting to TikTok waits for TikTok's review (owner, 3 Nov 2026). Missions that need a closed app are
 * hidden. Admins can still connect and post, and anyone already connected can still reconnect. Turn one on here once approved.
 */
export type Network = "tiktok" | "facebook" | "instagram" | "threads";
export const OPEN: Record<Network, boolean> = { tiktok: true, facebook: false, instagram: false, threads: false };
/** Posting to TikTok through Rezekii (TikTok's Content Posting review). */
export const TIKTOK_POSTING = false;

/** Why a closed one can't be used yet, for its tip. */
export const WAITING: Record<Network, string> = {
  tiktok: tx("Posting to TikTok is waiting for TikTok's approval. Coming soon."),
  facebook: tx("Waiting for Meta's approval. Coming soon."),
  instagram: tx("Waiting for Meta's approval. Coming soon."),
  threads: tx("Waiting for Meta's approval. Coming soon."),
};

/** Whether this person may start connecting it: open to everyone, or she's an admin. */
export const canConnect = (app: Network, admin = false) => OPEN[app] || admin;
/** Whether this person may post to it through Rezekii. */
export const canPost = (app: Network, admin = false) => (app === "tiktok" ? TIKTOK_POSTING && OPEN.tiktok : OPEN[app]) || admin;
/** Whether any of Facebook, Instagram or Threads is open. */
export const metaOpen = () => OPEN.facebook || OPEN.instagram || OPEN.threads;
