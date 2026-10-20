import { listPosts, type PostRow } from "../posting/store.ts";
import { tiktokKey } from "./picker.ts";
import { NAMES, type Channel } from "./rules.ts";
import { listSocialPosts, type SocialPostRow } from "./store.ts";

/** One channel of a post on the All channels board. `state` drives the colour dot; `note` explains it in words. */
export type BoardState = "draft" | "scheduled" | "posting" | "posted" | "failed" | "link" | "fbdraft" | "removed";
export type BoardChannel = {
  id: string;
  kind: Channel;
  /** The channel it went to (a social account id or "tiktok:<open_id>"), for the brand filter. */
  account: string;
  name: string;
  state: BoardState;
  note: string;
  permalink: string | null;
  canCancel: boolean;
  /** Failed: Try again sends it once more (M4). */
  canRetry: boolean;
  commentFailed: boolean;
  linkReminder: boolean;
};
export type BoardPost = { key: string; at: string | null; caption: string; channels: BoardChannel[] };

function tiktokChannel(p: PostRow): BoardChannel {
  const state: BoardState = p.status === "draft" ? "draft" : p.status === "scheduled" ? "scheduled" : p.status === "publishing" || p.status === "processing" ? "posting" : p.status === "failed" ? "failed" : "posted";
  const note = p.status === "sent_to_inbox" ? "In your TikTok drafts" : p.status === "failed" ? (p.last_error ?? "TikTok didn't take it.") : p.status === "processing" ? "TikTok is processing" : p.last_error && p.status === "scheduled" ? `Trying again soon: ${p.last_error}` : "";
  return { id: p.id, kind: "tiktok", account: tiktokKey(p.tiktok_open_id), name: NAMES.tiktok, state, note, permalink: null, canCancel: p.status === "scheduled" || p.status === "failed", canRetry: p.status === "failed", commentFailed: false, linkReminder: false };
}

function socialChannel(s: SocialPostRow): BoardChannel {
  const posted = s.status === "posted";
  const removed = s.status === "removed";
  const linkDue = posted && s.link_reminder && !s.link_done;
  const fbDraft = posted && s.platform === "facebook" && s.settings?.draft === true;
  const state: BoardState = s.status === "draft" ? "draft" : s.status === "scheduled" ? "scheduled" : s.status === "publishing" || s.status === "processing" ? "posting" : s.status === "failed" ? "failed" : removed ? "removed" : fbDraft ? "fbdraft" : linkDue ? "link" : "posted";
  const note = s.status === "failed" ? (s.last_error ?? "The channel didn't take it.")
    : removed ? `Deleted in ${NAMES[s.platform]} after it was posted`
    : fbDraft ? `Saved as a draft on the Page: publish it from Facebook or Meta Business Suite${s.link_reminder && !s.link_done ? ", then add the Shopee product link (Monetization)" : ""}`
    : linkDue ? "Add the Shopee product link in Facebook (Monetization), then tick Done"
    : posted && s.comment_status === "failed" ? `First comment failed: ${s.comment_error ?? "try again"}`
    : posted && s.comment_status === "pending" ? "Posting the first comment"
    : s.status === "processing" ? `${NAMES[s.platform]} is processing the video`
    : s.status === "scheduled" && s.last_error ? `Trying again soon: ${s.last_error}` : "";
  return { id: s.id, kind: s.platform, account: s.account_id ?? "", name: s.account_name ?? NAMES[s.platform], state, note, permalink: removed ? null : s.permalink, canCancel: s.status === "scheduled" || s.status === "draft" || s.status === "failed", canRetry: s.status === "failed", commentFailed: posted && s.comment_status === "failed", linkReminder: linkDue };
}

const ORDER: Channel[] = ["tiktok", "facebook", "instagram", "threads"];

/**
 * Every post the account made, with each channel's own status: the Meta channels of one New post are grouped, together
 * with the TikTok post they went out with. Newest scheduled first (drafts first).
 */
export async function boardPosts(userId: string): Promise<{ posts: BoardPost[]; now: number }> {
  const [tiktok, social] = await Promise.all([listPosts(userId), listSocialPosts(userId)]);
  const byTikTok = new Map(tiktok.map((p) => [p.id, p]));
  const groups = new Map<string, BoardPost>();
  const usedTikTok = new Set<string>();
  for (const s of social) {
    let g = groups.get(s.group_id);
    if (!g) {
      const tt = s.tiktok_post_id ? byTikTok.get(s.tiktok_post_id) : undefined;
      g = { key: s.group_id, at: s.scheduled_at ?? s.posted_at, caption: tt?.caption || s.caption, channels: tt && tt.status !== "cancelled" ? [tiktokChannel(tt)] : [] };
      if (tt) usedTikTok.add(tt.id);
      groups.set(s.group_id, g);
    }
    g.channels.push(socialChannel(s));
  }
  const posts = [...groups.values(), ...tiktok.filter((p) => !usedTikTok.has(p.id)).map((p) => ({ key: p.id, at: p.status === "posted" && p.posted_at ? p.posted_at : p.scheduled_at, caption: p.caption, channels: [tiktokChannel(p)] }))];
  for (const p of posts) p.channels.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return { posts: posts.sort((a, b) => (a.at ?? "9999").localeCompare(b.at ?? "9999") * -1), now: Date.now() };
}
