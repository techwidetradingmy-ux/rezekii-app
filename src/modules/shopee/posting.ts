import { ShopeeError } from "../../integrations/shopee/client.ts";
import { postShopeeVideo, shopeeCovers, shopeeUploadState, shopeeVideoStatus, uploadShopeeVideo } from "../../integrations/shopee/video.ts";
import { directLink } from "../posting/media.ts";
import { signedMediaUrl, type SocialPostRow } from "../social/store.ts";
import { freshShopeeToken, getShopee, markShopeeReconnect, RECONNECT_SHOPEE } from "./connections.ts";

/** A Shopee channel post's settings (New post): up to 6 products (sellers' own shop only), duet, stitch and the AI label. */
export type ShopeeSettings = { itemIds: number[]; duet: boolean; stitch: boolean; aigc: boolean };

/** What one try came to; the publisher saves it the same way as for the other channels. */
export type ShopeeOutcome =
  | { kind: "sent"; containerId: string }
  | { kind: "waiting" }
  | { kind: "posted"; postId: string }
  | { kind: "failed"; reason: string; final?: boolean; clearContainer?: boolean };

/**
 * Shopee only lets apps post for an account that has accepted the Shopee Video terms, and only a post made from Seller
 * Centre on a computer records that (tested 30 Oct 2026: a draft or a post from the Shopee app doesn't).
 */
export const FIRST_POST = "Shopee needs this account's first video to be posted from Seller Centre on a computer: open seller.shopee.com.my, go to Marketing Centre → Live & Video → Upload Video, tick \"By posting, you agree to Shopee Video's Terms of Service\" and post. Then press Try again.";
/** Large links are refused rather than held in memory: Rezekii's own uploads are up to 50 MB. */
const MAX_BYTES = 200 * 1024 * 1024;

const settingsOf = (p: SocialPostRow): ShopeeSettings => {
  const s = p.settings ?? {};
  const ids = Array.isArray(s.itemIds) ? s.itemIds.filter((x): x is number => typeof x === "number") : [];
  return { itemIds: ids.slice(0, 6), duet: s.duet !== false, stitch: s.stitch !== false, aigc: s.aigc === true };
};

function failure(err: unknown): ShopeeOutcome {
  if (err instanceof ShopeeError && err.code === "copyright_not_agree") return { kind: "failed", reason: FIRST_POST, final: true };
  if (err instanceof Error && err.message === RECONNECT_SHOPEE) return { kind: "failed", reason: RECONNECT_SHOPEE, final: true };
  return { kind: "failed", reason: `Shopee: ${err instanceof Error ? err.message : String(err)}` };
}

async function connectionOf(p: SocialPostRow) {
  return p.shopee_connection_id ? getShopee(p.shopee_connection_id) : null;
}

/** First try: sends the whole video to Shopee, which then processes it (a few minutes). */
export async function publishShopee(p: SocialPostRow): Promise<ShopeeOutcome> {
  const c = await connectionOf(p);
  if (!c) return { kind: "failed", reason: "Channel disconnected", final: true };
  if (c.status === "reconnect") return { kind: "failed", reason: RECONNECT_SHOPEE, final: true };
  if (!p.duration_sec) return { kind: "failed", reason: "Rezekii couldn't read the video's length, which Shopee needs. Upload the video file instead of a link.", final: true };
  try {
    await freshShopeeToken(c);
    const res = await fetch(p.storage_path ? await signedMediaUrl(p.storage_path) : directLink(p.link_url ?? ""), { cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return { kind: "failed", reason: `Rezekii couldn't fetch the video (${res.status}).` };
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return { kind: "failed", reason: "The video is over 200 MB. Upload a smaller file.", final: true };
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES) return { kind: "failed", reason: "The video is over 200 MB. Upload a smaller file.", final: true };
    return { kind: "sent", containerId: await uploadShopeeVideo(data, `${p.id}.mp4`, p.duration_sec) };
  } catch (err) {
    if (err instanceof ShopeeError && err.needsReconnect) await markShopeeReconnect(c.id);
    return failure(err);
  }
}

/** Later tries: once Shopee has processed the video, sets the cover (its first frame), caption and product and posts it. */
export async function checkShopee(p: SocialPostRow): Promise<ShopeeOutcome> {
  const c = await connectionOf(p);
  if (!c || !p.container_id) return { kind: "failed", reason: c ? "Nothing to check." : "Channel disconnected", final: !c };
  try {
    const up = await shopeeUploadState(p.container_id);
    if (up.state === "failed") return { kind: "failed", reason: `Shopee couldn't process the video${up.reason ? ` (${up.reason})` : ""}.`, clearContainer: true };
    if (up.state === "processing") return { kind: "waiting" };
    const token = await freshShopeeToken(c);
    const covers = await shopeeCovers(token, c.shopee_user_id, p.container_id);
    if (!covers.length) return { kind: "waiting" };
    const s = settingsOf(p);
    return { kind: "posted", postId: await postShopeeVideo(token, c.shopee_user_id, p.container_id, { caption: p.caption, cover: covers[0], itemIds: s.itemIds, duet: s.duet, stitch: s.stitch, aigc: s.aigc }) };
  } catch (err) {
    if (err instanceof ShopeeError && err.needsReconnect) await markShopeeReconnect(c.id);
    return failure(err);
  }
}

/** Whether a posted Shopee video still exists (deleted in Shopee: 400). */
export async function shopeeStillLive(p: SocialPostRow): Promise<boolean> {
  const c = await connectionOf(p);
  if (!c || c.status !== "active" || !p.external_post_id) return true;
  return (await shopeeVideoStatus(await freshShopeeToken(c), c.shopee_user_id, p.external_post_id)) !== 400;
}
