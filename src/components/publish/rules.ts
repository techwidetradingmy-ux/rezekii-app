/**
 * Posting rules from V1 (modules/social/rules.ts, settings.ts, posting/rules.ts), in plain English: caption limits, where the
 * product link goes in each app, Rezekii's version of the caption per app, and the checks that block or warn.
 */

export type Platform = "facebook" | "instagram" | "threads";
export type Channel = Platform | "tiktok";
export const APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads"];
export const NAMES: Record<Channel, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };
/** For V2's PlatformIcon. */
export const ICON: Record<Channel, "TikTok" | "Facebook" | "Instagram" | "Threads"> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };
/** What a channel is called in each app, for "Facebook · 3 Pages". */
export const UNIT: Record<Channel, string> = { tiktok: "accounts", facebook: "Pages", instagram: "accounts", threads: "profiles" };

export const CAPTION_MAX: Record<Channel, number> = { tiktok: 2200, facebook: 63206, instagram: 2200, threads: 500 };
export const COMMENT_MAX: Record<Platform, number> = { facebook: 8000, instagram: 2200, threads: 500 };
const HASHTAG_MAX: Record<Channel, number> = { tiktok: 5, instagram: 5, threads: 0, facebook: Infinity };
const THREADS_LINK_MAX = 5;
export const COLLABORATORS_MAX = 3;
export const TAGS_MAX = 20;

export type Placement = { caption: boolean; comment: boolean };
/**
 * Where the call to action and product link go (owner, 28 Oct 2026): never in the caption, always in the first comment.
 * TikTok doesn't let apps comment, so its product goes in the yellow basket.
 */
export const DEFAULT_PLACEMENT: Record<Channel, Placement> = {
  tiktok: { caption: false, comment: false },
  instagram: { caption: false, comment: true },
  threads: { caption: false, comment: true },
  facebook: { caption: false, comment: true },
};

export type ReplyControl = "everyone" | "accounts_you_follow" | "followers_only" | "mentioned_only";
export const REPLY_CONTROLS: [ReplyControl, string][] = [["everyone", "Everyone"], ["accounts_you_follow", "Accounts you follow"], ["followers_only", "Your followers"], ["mentioned_only", "Only accounts you mention"]];
export type TrialMode = "off" | "manual" | "auto";

const URL_RE = /https?:\/\/\S+/g;
const TAG_RE = /#[\p{L}\p{N}_]+/gu;
export const hashtags = (t: string) => t.match(TAG_RE) ?? [];
export const links = (t: string) => t.match(URL_RE) ?? [];

const enc = typeof TextEncoder === "undefined" ? null : new TextEncoder();
/** Threads counts an emoji as its UTF-8 length (2–4); everything else as one. */
export function threadsLength(t: string): number {
  let n = 0;
  for (const c of t) {
    const cp = c.codePointAt(0) ?? 0;
    n += cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf) ? (enc?.encode(c).length ?? 2) : 1;
  }
  return n;
}
export const lengthFor = (ch: Channel, t: string) => (ch === "threads" ? threadsLength(t) : t.length);

/** A sentence that carries a link, with its call to action and emoji around it. */
const CTA_WITH_LINK = /[^.!?\n]*https?:\/\/\S+[^\p{L}\p{N}\n]*/gu;
const TAG = /(^|[^\S\n]|\n)#[\p{L}\p{N}_]+/gu;
const tidy = (s: string) => s.split("\n").map((l) => l.replace(/[ \t]{2,}/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();

/**
 * The caption Rezekii suggests for one app, written from the main caption: a link goes out together with its call to action
 * (both belong in the first comment), hashtags are cut to the app's cap and Threads gets none. TikTok gets the hook and its
 * hashtags.
 */
export function autoCaption(ch: Channel, main: string): string {
  const text = main.replace(CTA_WITH_LINK, "");
  if (!tidy(text)) return "";
  if (ch === "tiktok") {
    const hook = (tidy(text.replace(TAG, "$1")).match(/^[^.!?\n]*[.!?]?/) ?? [""])[0].trim();
    return [hook, hashtags(main).slice(0, HASHTAG_MAX.tiktok).join(" ")].filter(Boolean).join(" ");
  }
  let n = 0;
  return tidy(text.replace(TAG, (m, before: string) => (++n <= HASHTAG_MAX[ch] ? m : before)));
}

/** An app's first comment: any text of the creator's own, then the call to action with the product link. */
export function autoComment(ch: Platform, link: string, own = "", cta = ""): string {
  const text = own.trim();
  const line = link ? linkLine(link, cta.trim() || (ch === "threads" ? "Link produk 👇" : "Dapatkan di sini 👉")) : cta.trim();
  return [text, line && !text.includes(link || line) ? line : ""].filter(Boolean).join("\n");
}

/** True when the text carries a link or a call to action that should be in the first comment instead. */
export const hasLinkOrCta = (text: string, cta = "") => links(text).length > 0 || (!!cta.trim() && text.includes(cta.trim()));

/** Hashtags typed in their own box ("#a, b c"): each once, with a #. */
export function parseHashtags(input: string): string[] {
  const out: string[] = [];
  for (const w of input.split(/[\s,]+/)) {
    const tag = w.replace(/^#+/, "").match(/^[\p{L}\p{N}_]+/u)?.[0];
    if (tag && !out.some((t) => t.toLowerCase() === `#${tag}`.toLowerCase())) out.push(`#${tag}`);
  }
  return out;
}

/** The main caption with the Hashtags box added at the very bottom. */
export function withHashtags(main: string, tags: string[]): string {
  const have = new Set(hashtags(main).map((t) => t.toLowerCase()));
  const add = tags.filter((t) => !have.has(t.toLowerCase()));
  return [main.trim(), add.join(" ")].filter(Boolean).join("\n\n");
}

const linkLine = (link: string, cta = "") => (cta.trim() ? `${cta.trim()} ${link}` : link);

/** Problems that block scheduling this app (empty = OK). */
export function channelProblems(ch: Platform, caption: string, comment: string, durationSec?: number | null): string[] {
  const out: string[] = [];
  const n = lengthFor(ch, caption);
  const max = CAPTION_MAX[ch].toLocaleString("en-US");
  if (n > CAPTION_MAX[ch]) out.push(ch === "threads" ? `Threads allows ${max} characters (an emoji counts as 2–4). This caption has ${n.toLocaleString("en-US")}.` : `${NAMES[ch]} allows ${max} characters. This caption has ${n.toLocaleString("en-US")}.`);
  if (comment && lengthFor(ch, comment) > COMMENT_MAX[ch]) out.push(`${NAMES[ch]} first comment: ${COMMENT_MAX[ch].toLocaleString("en-US")} characters at most.`);
  if (ch === "threads" && links(caption).length > THREADS_LINK_MAX) out.push(`Threads allows at most ${THREADS_LINK_MAX} links in a post.`);
  if (ch === "threads" && durationSec && durationSec > 300) out.push("Threads takes videos up to 5 minutes.");
  if (ch === "instagram" && durationSec && durationSec < 3) out.push("Instagram Reels must be at least 3 seconds long.");
  return out;
}

/** Warnings that don't block (the app still takes the post). */
export function channelWarnings(ch: Channel, caption: string): string[] {
  const n = hashtags(caption).length;
  if ((ch === "instagram" || ch === "tiktok") && n > HASHTAG_MAX[ch]) return [`${NAMES[ch]} allows ${HASHTAG_MAX[ch]} hashtags. This caption has ${n}.`];
  if (ch === "threads" && n > 0) return ["On Threads, hashtags in the text show as plain words. A post gets one topic: set it in the Topic box."];
  return [];
}

/** Instagram usernames from what was typed ("@a, b c"): the valid ones, lower case; `bad` lists the rest. */
export function parseUsernames(input: string): { list: string[]; bad: string[] } {
  const list: string[] = [], bad: string[] = [];
  for (const p of input.split(/[\s,]+/).map((s) => s.trim().replace(/^@/, "").toLowerCase()).filter(Boolean)) {
    if (!/^[a-z0-9._]{1,30}$/.test(p)) bad.push(p);
    else if (!list.includes(p)) list.push(p);
  }
  return { list, bad };
}

/** A Threads topic as Threads takes it: no #, no periods or ampersands, up to 50 characters. */
export const cleanTopic = (s: string) => s.trim().replace(/^#+/, "").replace(/[.&]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
/** The topic Rezekii suggests for Threads: the main caption's first hashtag. */
export const threadsTopic = (main: string) => cleanTopic(hashtags(main)[0] ?? "");

export type Privacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
export const PRIVACY: [Privacy, string][] = [["PUBLIC_TO_EVERYONE", "Everyone"], ["MUTUAL_FOLLOW_FRIENDS", "Friends (followers you follow back)"], ["FOLLOWER_OF_CREATOR", "Followers"], ["SELF_ONLY", "Only me"]];

/** TikTok's Content Sharing Guidelines for a direct post (drafts sent to TikTok only need a video). */
export function tiktokProblems(p: { mode: "direct" | "inbox"; caption: string; privacy: Privacy | ""; promo: boolean; own: boolean; branded: boolean }): string[] {
  const out: string[] = [];
  if (p.caption.length > CAPTION_MAX.tiktok) out.push(`The caption is longer than ${CAPTION_MAX.tiktok} characters.`);
  if (p.mode === "inbox") return out;
  if (!p.privacy) out.push("Choose who can view this post.");
  if (p.promo && !p.own && !p.branded) out.push("You need to indicate if your content promotes yourself, a third party, or both.");
  if (p.promo && p.branded && p.privacy === "SELF_ONLY") out.push("Branded content visibility cannot be set to private.");
  return out;
}
/** The consent line TikTok requires above the post button. */
export const consentLine = (promo: boolean, branded: boolean) =>
  promo && branded ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation." : "By posting, you agree to TikTok's Music Usage Confirmation.";
