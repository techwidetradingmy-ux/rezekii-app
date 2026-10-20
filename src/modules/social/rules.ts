/**
 * Facebook Page, Instagram and Threads posting rules (docs/flows/social-posting.md), kept free of I/O so the composer
 * and the server use exactly the same ones. TikTok's own rules stay in modules/posting/rules.ts.
 */
export type Platform = "facebook" | "instagram" | "threads";
export type Channel = Platform | "tiktok";
export const PLATFORMS: Platform[] = ["facebook", "instagram", "threads"];
export const NAMES: Record<Channel, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };

/** Caption and first-comment limits, and the hashtag caps each app applies (TikTok's 2,200 is its API limit). */
export const CAPTION_MAX: Record<Channel, number> = { tiktok: 2200, facebook: 63206, instagram: 2200, threads: 500 };
export const COMMENT_MAX: Record<Platform, number> = { facebook: 8000, instagram: 2200, threads: 500 };
/** Threads gets no hashtags in its text: its one topic goes in the Topic box (settings.ts). */
export const HASHTAG_MAX: Record<Channel, number> = { tiktok: 5, instagram: 5, threads: 0, facebook: Infinity };
export const THREADS_LINK_MAX = 5;
/** Facebook vertical videos of 3–90 s go out as a Reel (Facebook's Reels API); others as a Page video. */
export const REEL_SECONDS = { min: 3, max: 90 };
/** Videos Threads accepts (5 minutes). */
export const THREADS_MAX_SECONDS = 300;

export type Placement = { caption: boolean; comment: boolean };
/** Where the product link goes by default, from how each channel is used (owner, 19 Oct 2026). */
export const DEFAULT_PLACEMENT: Record<Channel, Placement> = {
  tiktok: { caption: false, comment: false },
  instagram: { caption: false, comment: false },
  threads: { caption: false, comment: true },
  facebook: { caption: true, comment: true },
};

const URL_RE = /https?:\/\/\S+/g;
const TAG_RE = /#[\p{L}\p{N}_]+/gu;
export const hashtags = (t: string) => t.match(TAG_RE) ?? [];
export const links = (t: string) => t.match(URL_RE) ?? [];

/** Threads counts an emoji as its UTF-8 length (2–4); everything else as one. */
export function threadsLength(t: string): number {
  let n = 0;
  for (const c of t) {
    const cp = c.codePointAt(0) ?? 0;
    n += cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf) ? Buffer.byteLength(c, "utf8") : 1;
  }
  return n;
}
export const lengthFor = (ch: Channel, t: string) => (ch === "threads" ? threadsLength(t) : t.length);

/** A sentence that carries a link, with its call to action and emoji around it ("Dapatkan di sini 👉🏻 https://… 🛒"). */
const CTA_WITH_LINK = /[^.!?\n]*https?:\/\/\S+[^\p{L}\p{N}\n]*/gu;
const TAG_LINE = /^(?:#[\p{L}\p{N}_]+\s*)+$/u;
const tidy = (s: string) => s.split("\n").map((l) => l.replace(/[ \t]{2,}/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Rezekii's version of the main caption for one channel (C3b): Facebook keeps links where they were typed; elsewhere a
 * link goes together with its whole call to action and emoji. A sentence about the link is rewritten for where the link
 * really is. Hashtags stay where they were typed (the Hashtags box adds its tags at the very bottom), cut to the channel's
 * cap; Threads gets none, since they can't be tapped there (it takes a topic instead). TikTok gets a short caption
 * pointing to the yellow basket.
 */
export function autoCaption(ch: Channel, main: string, place: Placement = DEFAULT_PLACEMENT[ch]): string {
  const keep = ch !== "tiktok" && place.caption;
  const text = keep ? main : main.replace(CTA_WITH_LINK, "");
  if (!tidy(text)) return "";
  if (ch === "tiktok") {
    const hook = (tidy(text.replace(TAG, "$1")).match(/^[^.!?\n]*[.!?]?/) ?? [""])[0].trim();
    return [hook, "Produk dekat beg kuning.", hashtags(main).slice(0, HASHTAG_MAX.tiktok).join(" ")].filter(Boolean).join(" ");
  }
  let n = 0;
  const capped = tidy(text.replace(TAG, (m, before: string) => (++n <= HASHTAG_MAX[ch] ? m : before)));
  const line = keep ? null : place.comment ? "Link produk ada dalam komen." : ch === "instagram" ? "Link dekat bio." : "";
  // Leading emoji (👉🏻) of a sentence about the link stay with the rewritten sentence.
  return line === null ? capped : tidy(capped.replace(/[^.!?\n]*\blink\b[^.!?\n]*[.!?]?/gi, (m) => (m.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "") + line));
}
const TAG = /(^|[^\S\n]|\n)#[\p{L}\p{N}_]+/gu;

/**
 * A channel's first comment: the owner's own first comment (from Main) with the product link after it when that channel's
 * link goes in the comment; without one, Rezekii's line with the link (C4b).
 */
export function autoComment(ch: Platform, link: string, place: Placement = DEFAULT_PLACEMENT[ch], own = "", cta = ""): string {
  const text = own.trim(), withLink = !!link && place.comment;
  if (text) return withLink && !text.includes(link) ? `${text}\n${linkLine(link, cta)}` : text;
  if (!withLink) return "";
  if (cta.trim()) return linkLine(link, cta);
  return ch === "threads" ? `Link produk 👇\n${link}` : ch === "facebook" ? `Dapatkan di sini: ${link}` : link;
}

/** Hashtags typed in their own box ("#a, b c"): each once, with a #. */
export function parseHashtags(input: string): string[] {
  const out: string[] = [];
  for (const w of input.split(/[\s,]+/)) {
    const tag = w.replace(/^#+/, "").match(/^[\p{L}\p{N}_]+/u)?.[0];
    if (tag && !out.some((t) => t.toLowerCase() === `#${tag}`.toLowerCase())) out.push(`#${tag}`);
  }
  return out;
}

/** The main caption with the Hashtags box added at the very bottom (tags already in the caption aren't repeated). */
export function withHashtags(main: string, tags: string[]): string {
  const have = new Set(hashtags(main).map((t) => t.toLowerCase()));
  const add = tags.filter((t) => !have.has(t.toLowerCase()));
  return [main.trim(), add.join(" ")].filter(Boolean).join("\n\n");
}

/**
 * The caption that is actually posted: the channel's text plus the link when it goes in the caption and isn't typed in it
 * already, placed above the hashtags so they stay at the very bottom.
 */
export function postedCaption(ch: Channel, text: string, link: string, place: Placement, cta = ""): string {
  if (ch === "tiktok" || !link || !place.caption || text.includes(link)) return text;
  return aboveTags(text, linkLine(link, cta));
}

/** The product link as Rezekii adds it: after the call to action when there is one ("Dapatkan di sini 👉 https://…"). */
export const linkLine = (link: string, cta = "") => (cta.trim() ? `${cta.trim()} ${link}` : link);

/** Adds a line at the end of a caption, above a closing line of hashtags so they stay at the very bottom. */
export function aboveTags(text: string, line: string): string {
  const lines = text.split("\n");
  const last = lines[lines.length - 1].trim();
  if (!TAG_LINE.test(last)) return text ? `${text}\n${line}` : line;
  const body = lines.slice(0, -1).join("\n").trim();
  return body ? `${body}\n${line}\n\n${last}` : `${line}\n\n${last}`;
}

/** Plain-language problems that block scheduling this channel (empty = OK). */
export function channelProblems(ch: Platform, caption: string, comment: string, durationSec?: number | null): string[] {
  const out: string[] = [];
  const n = lengthFor(ch, caption);
  if (n > CAPTION_MAX[ch]) out.push(`${NAMES[ch]} allows ${CAPTION_MAX[ch].toLocaleString("en-US")} characters${ch === "threads" ? " (an emoji counts as 2–4)" : ""}. This caption has ${n.toLocaleString("en-US")}.`);
  if (comment && lengthFor(ch, comment) > COMMENT_MAX[ch]) out.push(`${NAMES[ch]} first comment: ${COMMENT_MAX[ch].toLocaleString("en-US")} characters at most.`);
  if (ch === "threads" && links(caption).length > THREADS_LINK_MAX) out.push(`Threads allows at most ${THREADS_LINK_MAX} links in a post.`);
  if (ch === "threads" && durationSec && durationSec > THREADS_MAX_SECONDS) out.push("Threads takes videos up to 5 minutes.");
  if (ch === "instagram" && durationSec && durationSec < 3) out.push("Instagram Reels must be at least 3 seconds long.");
  return out;
}

/** Warnings that don't block (the channel will still take the post). */
export function channelWarnings(ch: Channel, caption: string): string[] {
  const n = hashtags(caption).length;
  if ((ch === "instagram" || ch === "tiktok") && n > HASHTAG_MAX[ch]) return [`${NAMES[ch]} allows ${HASHTAG_MAX[ch]} hashtags. This caption has ${n}.`];
  if (ch === "threads" && n > 0) return ["On Threads, hashtags in the text show as plain words. A post gets one topic: set it in the Topic box."];
  return [];
}

/** Facebook: a Reel when the video fits Facebook's Reels API, otherwise a Page video. */
export const facebookAsReel = (durationSec?: number | null) => !!durationSec && durationSec >= REEL_SECONDS.min && durationSec <= REEL_SECONDS.max;
