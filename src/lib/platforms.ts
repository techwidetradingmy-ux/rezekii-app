import { tx } from "./i18n/lang.ts";

/**
 * Which apps anyone can connect (owner, 3 Nov 2026). TikTok's app (Continue with TikTok, linking a TikTok account and posting)
 * and Meta's (Facebook Page, Instagram, Threads) only let in the testers added there until each platform approves Rezekii, so
 * until then their Connect buttons read Not Available Yet and the missions that need them are hidden. Admins can still connect,
 * and anyone already connected can still reconnect. Turn one on here once its platform approves it.
 */
export type Network = "tiktok" | "facebook" | "instagram" | "threads";
export const OPEN: Record<Network, boolean> = { tiktok: false, facebook: false, instagram: false, threads: false };

/** Why a closed one can't be connected, for its tip. */
export const WAITING: Record<Network, string> = {
  tiktok: tx("Waiting for TikTok's approval. Coming soon."),
  facebook: tx("Waiting for Meta's approval. Coming soon."),
  instagram: tx("Waiting for Meta's approval. Coming soon."),
  threads: tx("Waiting for Meta's approval. Coming soon."),
};

/** Whether this person may start connecting it: open to everyone, or she's an admin. */
export const canConnect = (app: Network, admin = false) => OPEN[app] || admin;
/** Whether any of Facebook, Instagram or Threads is open. */
export const metaOpen = () => OPEN.facebook || OPEN.instagram || OPEN.threads;
