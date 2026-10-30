import { tx, type Lang } from "../../lib/i18n/lang.ts";
import { translate } from "../../lib/i18n/translate.ts";
import { listPosts, type PostRow } from "../posting/store.ts";
import { tiktokKey } from "./picker.ts";
import { NAMES, type Channel } from "./rules.ts";
import { listSocialPosts, type SocialPostRow } from "./store.ts";

/** One channel of a post on the All channels board. `state` drives the colour dot; `note` explains it in words. */
export type BoardState = "draft" | "scheduled" | "posting" | "posted" | "failed" | "fbdraft" | "removed";
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
  /** Something is happening now or within 30 minutes: All channels keeps itself up to date (M5). */
  active: boolean;
};
const soon = (iso: string | null) => !!iso && Date.parse(iso) - Date.now() < 30 * 60e3;
// Its time has come but the timer hasn't started it yet (it runs every minute): that's Posting, not Scheduled (M8).
const due = (status: string, next: string | null) => status === "scheduled" && !!next && Date.parse(next) <= Date.now();
export type BoardPost = { key: string; at: string | null; caption: string; channels: BoardChannel[] };

function tiktokChannel(p: PostRow, lang: Lang): BoardChannel {
  const now = due(p.status, p.next_attempt_at);
  const state: BoardState = p.status === "draft" ? "draft" : p.status === "scheduled" && !now ? "scheduled" : p.status === "publishing" || p.status === "processing" || now ? "posting" : p.status === "failed" ? "failed" : "posted";
  const note = p.status === "sent_to_inbox" ? translate(lang, "In your TikTok drafts") : p.status === "failed" ? translate(lang, p.last_error ?? tx("TikTok didn't take it.")) : p.status === "processing" ? translate(lang, "TikTok is processing") : p.last_error && p.status === "scheduled" ? (now ? translate(lang, "Trying again now: {error}", { error: translate(lang, p.last_error) }) : translate(lang, "Trying again soon: {error}", { error: translate(lang, p.last_error) })) : now ? translate(lang, "Starting within a minute") : "";
  return { id: p.id, kind: "tiktok", account: tiktokKey(p.tiktok_open_id), name: NAMES.tiktok, state, note, permalink: null, canCancel: p.status === "scheduled" || p.status === "failed", canRetry: p.status === "failed", commentFailed: false, active: p.status === "publishing" || p.status === "processing" || (p.status === "scheduled" && soon(p.next_attempt_at)) };
}

function socialChannel(s: SocialPostRow, lang: Lang): BoardChannel {
  const posted = s.status === "posted";
  const removed = s.status === "removed";
  const dropped = Array.isArray(s.settings?.dropped) ? (s.settings.dropped as string[]) : [];
  const fbDraft = posted && s.platform === "facebook" && s.settings?.draft === true;
  const now = due(s.status, s.next_attempt_at);
  const state: BoardState = s.status === "draft" ? "draft" : s.status === "scheduled" ? (now ? "posting" : "scheduled") : s.status === "publishing" || s.status === "processing" ? "posting" : s.status === "failed" ? "failed" : removed ? "removed" : fbDraft ? "fbdraft" : "posted";
  const app = NAMES[s.platform];
  const users = dropped.map((u) => `@${u}`).join(", ");
  const note = s.status === "failed" ? translate(lang, s.last_error ?? tx("The channel didn't take it."))
    : removed ? translate(lang, "Deleted in {app} after it was posted", { app })
    : fbDraft ? translate(lang, "Saved as a draft on the Page: publish it from Facebook or Meta Business Suite")
    : posted && s.comment_status === "failed" ? translate(lang, "First comment failed: {error}", { error: translate(lang, s.comment_error ?? tx("try again")) })
    : posted && s.comment_status === "pending" ? translate(lang, "Posting the first comment")
    : posted && dropped.length ? (dropped.length > 1 ? translate(lang, "Posted without {users}: Instagram couldn't reach those accounts (it must exist and be public)", { users }) : translate(lang, "Posted without {users}: Instagram couldn't reach that account (it must exist and be public)", { users }))
    : s.status === "processing" ? translate(lang, "{app} is processing the video", { app })
    : s.status === "scheduled" && s.last_error ? (now ? translate(lang, "Trying again now: {error}", { error: translate(lang, s.last_error) }) : translate(lang, "Trying again soon: {error}", { error: translate(lang, s.last_error) }))
    : now ? translate(lang, "Starting within a minute") : "";
  return { id: s.id, kind: s.platform, account: s.account_id ?? "", name: s.account_name ?? NAMES[s.platform], state, note, permalink: removed ? null : s.permalink, canCancel: s.status === "scheduled" || s.status === "draft" || s.status === "failed", canRetry: s.status === "failed", commentFailed: posted && s.comment_status === "failed", active: s.status === "publishing" || s.status === "processing" || (posted && s.comment_status === "pending") || (s.status === "scheduled" && soon(s.next_attempt_at)) };
}

const ORDER: Channel[] = ["tiktok", "facebook", "instagram", "threads"];

/**
 * Every post the account made, with each channel's own status: the Meta channels of one New post are grouped, together
 * with the TikTok post they went out with. Newest scheduled first (drafts first).
 */
export async function boardPosts(userId: string, lang: Lang = "en"): Promise<{ posts: BoardPost[]; now: number }> {
  const [tiktok, social] = await Promise.all([listPosts(userId), listSocialPosts(userId)]);
  const byTikTok = new Map(tiktok.map((p) => [p.id, p]));
  const groups = new Map<string, BoardPost>();
  const usedTikTok = new Set<string>();
  for (const s of social) {
    let g = groups.get(s.group_id);
    if (!g) {
      const tt = s.tiktok_post_id ? byTikTok.get(s.tiktok_post_id) : undefined;
      g = { key: s.group_id, at: s.scheduled_at ?? s.posted_at, caption: tt?.caption || s.caption, channels: tt && tt.status !== "cancelled" ? [tiktokChannel(tt, lang)] : [] };
      if (tt) usedTikTok.add(tt.id);
      groups.set(s.group_id, g);
    }
    g.channels.push(socialChannel(s, lang));
  }
  const posts = [...groups.values(), ...tiktok.filter((p) => !usedTikTok.has(p.id)).map((p) => ({ key: p.id, at: p.status === "posted" && p.posted_at ? p.posted_at : p.scheduled_at, caption: p.caption, channels: [tiktokChannel(p, lang)] }))];
  for (const p of posts) p.channels.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return { posts: posts.sort((a, b) => (a.at ?? "9999").localeCompare(b.at ?? "9999") * -1), now: Date.now() };
}
