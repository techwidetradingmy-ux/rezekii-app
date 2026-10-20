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

/**
 * Rezekii's version of the main caption for one channel: links taken out, the sentence about the link rewritten for where
 * the link really is, hashtags cut to the channel's cap (none on Threads, which takes a topic instead). TikTok gets a
 * short caption pointing to the yellow basket.
 */
export function autoCaption(ch: Channel, main: string, place: Placement = DEFAULT_PLACEMENT[ch]): string {
  const clean = main.replace(URL_RE, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) return "";
  if (ch === "tiktok") {
    const hook = (clean.match(/^[^.!?\n]*[.!?]?/) ?? [""])[0].trim();
    return [hook, "Produk dekat beg kuning.", hashtags(main).slice(0, HASHTAG_MAX.tiktok).join(" ")].filter(Boolean).join(" ");
  }
  const line = place.caption ? null : place.comment ? "Link produk ada dalam komen." : ch === "instagram" ? "Link dekat bio." : "";
  let t = line === null ? clean : clean.replace(/[^.!?\n]*\blink\b[^.!?\n]*[.!?]?/gi, (m) => (m.match(/^\s*/)?.[0] ?? "") + line);
  let n = 0;
  t = t.replace(/\s?#[\p{L}\p{N}_]+/gu, (m) => (++n <= HASHTAG_MAX[ch] ? m : ""));
  return t.replace(/[ \t]{2,}/g, " ").trim();
}

/** Rezekii's first comment for a channel: the product link, when that channel's link goes in the comment. */
export function autoComment(ch: Platform, link: string, place: Placement = DEFAULT_PLACEMENT[ch]): string {
  if (!link || !place.comment) return "";
  return ch === "threads" ? `Link produk 👇\n${link}` : ch === "facebook" ? `Dapatkan di sini: ${link}` : link;
}

/** The caption that is actually posted: the channel's text plus the link at the end when it goes in the caption. */
export const postedCaption = (ch: Channel, text: string, link: string, place: Placement) =>
  ch !== "tiktok" && link && place.caption ? `${text}\n${link}` : text;

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
