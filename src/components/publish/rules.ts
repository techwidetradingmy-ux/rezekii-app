import { makeT, tx, type T } from "@/lib/i18n/lang";

/**
 * Posting rules from V1 (modules/social/rules.ts, settings.ts, posting/rules.ts), in plain English: caption limits, where the
 * product link goes in each app, Rezekii's version of the caption per app, and the checks that block or warn. Messages are
 * written in the same words as V1's, in her language when New Post passes its translator (owner, 3 Nov 2026).
 */
/** English, as written (the composer reads which section a problem belongs to from it). */
const EN: T = makeT(null);

export type Platform = "facebook" | "instagram" | "threads";
/** Shopee Video too (owner, 21 Nov 2026: from rezekii.com's Shopee build), shown only where Shopee is set up. */
export type Channel = Platform | "tiktok" | "shopee";
export const APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads", "shopee"];
export const NAMES: Record<Channel, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads", shopee: "Shopee" };
/** For V2's PlatformIcon. */
export const ICON: Record<Channel, "TikTok" | "Facebook" | "Instagram" | "Threads" | "Shopee"> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads", shopee: "Shopee" };

export const CAPTION_MAX: Record<Channel, number> = { tiktok: 2200, facebook: 63206, instagram: 2200, threads: 500, shopee: 150 };
export const COMMENT_MAX: Record<Platform, number> = { facebook: 8000, instagram: 2200, threads: 500 };
const HASHTAG_MAX: Record<Channel, number> = { tiktok: 5, instagram: 5, threads: 0, facebook: Infinity, shopee: Infinity };
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
  // Shopee shows a shop's own products under the video instead, and has no first comment.
  shopee: { caption: false, comment: false },
};

export type ReplyControl = "everyone" | "accounts_you_follow" | "followers_only" | "mentioned_only";
export const REPLY_CONTROLS: [ReplyControl, string][] = [["everyone", tx("Everyone")], ["accounts_you_follow", tx("Accounts you follow")], ["followers_only", tx("Your followers")], ["mentioned_only", tx("Only accounts you mention")]];
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
 * (both belong in the first comment), hashtags are cut to the app's cap and Threads gets none. TikTok gets the caption as
 * typed too: TikTok's guidelines don't let apps change it (owner, 6 Nov 2026, as on rezekii.com: it kept only the first sentence).
 */
export function autoCaption(ch: Channel, main: string): string {
  const text = main.replace(CTA_WITH_LINK, "");
  if (!tidy(text)) return "";
  // Shopee has no link anywhere, so a sentence about the link goes too.
  if (ch === "shopee") return shopeeCaption(text.replace(/[^.!?\n]*\blink\b[^.!?\n]*[.!?]?/gi, ""), hashtags(main));
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
export function channelProblems(ch: Platform, caption: string, comment: string, durationSec?: number | null, t: T = EN): string[] {
  const out: string[] = [];
  const n = lengthFor(ch, caption);
  const v = { app: NAMES[ch], max: CAPTION_MAX[ch].toLocaleString("en-US"), n: n.toLocaleString("en-US") };
  if (n > CAPTION_MAX[ch]) out.push(ch === "threads" ? t("{app} allows {max} characters (an emoji counts as 2–4). This caption has {n}.", v) : t("{app} allows {max} characters. This caption has {n}.", v));
  if (comment && lengthFor(ch, comment) > COMMENT_MAX[ch]) out.push(t("{app} first comment: {max} characters at most.", { app: NAMES[ch], max: COMMENT_MAX[ch].toLocaleString("en-US") }));
  if (ch === "threads" && links(caption).length > THREADS_LINK_MAX) out.push(t("Threads allows at most {max} links in a post.", { max: THREADS_LINK_MAX }));
  if (ch === "threads" && durationSec && durationSec > 300) out.push(t("Threads takes videos up to 5 minutes."));
  if (ch === "instagram" && durationSec && durationSec < 3) out.push(t("Instagram Reels must be at least 3 seconds long."));
  return out;
}

/** Warnings that don't block (the app still takes the post). */
export function channelWarnings(ch: Channel, caption: string, t: T = EN): string[] {
  const n = hashtags(caption).length;
  if ((ch === "instagram" || ch === "tiktok") && n > HASHTAG_MAX[ch]) return [t("{app} allows {max} hashtags. This caption has {n}.", { app: NAMES[ch], max: HASHTAG_MAX[ch], n })];
  if (ch === "threads" && n > 0) return [t("On Threads, hashtags in the text show as plain words. A post gets one topic: set it in the Topic box.")];
  return [];
}

/**
 * Shopee's 150 characters: the caption without links as it is when it fits; otherwise its first sentence, then as many
 * hashtags as still fit, cut at a word if even the first sentence is too long.
 */
function shopeeCaption(text: string, tags: string[]): string {
  const all = tidy(text);
  const max = CAPTION_MAX.shopee;
  if (all.length <= max) return all;
  let out = (tidy(text.replace(TAG, "$1")).match(/^[^.!?\n]*[.!?]?/) ?? [""])[0].trim();
  if (out.length > max) out = out.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  for (const tag of tags) if (`${out} ${tag}`.length <= max) out = `${out} ${tag}`;
  return out;
}

/** Shopee Video takes videos longer than 3 seconds, up to 3 minutes. */
export const SHOPEE_SECONDS = { min: 4, max: 180 };

/** Plain-language problems that block scheduling to Shopee (empty = OK). */
export function shopeeProblems(caption: string, durationSec?: number | null, t: T = EN): string[] {
  const out: string[] = [];
  if (caption.length > CAPTION_MAX.shopee) out.push(t("{app} allows {max} characters. This caption has {n}.", { app: "Shopee", max: CAPTION_MAX.shopee, n: caption.length }));
  if (links(caption).length) out.push(t("Shopee captions can't have links. The product shows under the video instead."));
  if (durationSec && (durationSec < SHOPEE_SECONDS.min || durationSec > SHOPEE_SECONDS.max)) out.push(t("Shopee Video takes videos longer than 3 seconds, up to 3 minutes."));
  return out;
}

/** A Shopee product link's shop and item, from a full link (…-i.SHOP.ITEM or /product/SHOP/ITEM); null for short links. */
export function shopeeProduct(link: string): { shopId: string; itemId: string } | null {
  const m = link.match(/^https?:\/\/(?:[\w-]+\.)*shopee\.[\w.]+\/(?:[^?#]*-i\.(\d+)\.(\d+)|product\/(\d+)\/(\d+))/i);
  return m ? { shopId: m[1] ?? m[3], itemId: m[2] ?? m[4] } : null;
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
export const PRIVACY: [Privacy, string][] = [["PUBLIC_TO_EVERYONE", tx("Everyone")], ["MUTUAL_FOLLOW_FRIENDS", tx("Friends (followers you follow back)")], ["FOLLOWER_OF_CREATOR", tx("Followers")], ["SELF_ONLY", tx("Only me")]];

/** TikTok's Content Sharing Guidelines for a direct post (drafts sent to TikTok only need a video). */
export function tiktokProblems(p: { mode: "direct" | "inbox"; caption: string; privacy: Privacy | ""; promo: boolean; own: boolean; branded: boolean }, t: T = EN): string[] {
  const out: string[] = [];
  if (p.caption.length > CAPTION_MAX.tiktok) out.push(t("The caption is longer than {max} characters.", { max: CAPTION_MAX.tiktok }));
  if (p.mode === "inbox") return out;
  if (!p.privacy) out.push(t("Choose who can view this post."));
  if (p.promo && !p.own && !p.branded) out.push(t("You need to indicate if your content promotes yourself, a third party, or both."));
  if (p.promo && p.branded && p.privacy === "SELF_ONLY") out.push(t("Branded content visibility cannot be set to private."));
  return out;
}
/** The consent line TikTok requires above the post button. */
export const consentLine = (promo: boolean, branded: boolean, t: T = EN) =>
  promo && branded ? t("By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation.") : t("By posting, you agree to TikTok's Music Usage Confirmation.");
