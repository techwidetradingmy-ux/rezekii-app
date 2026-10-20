/**
 * Post settings per app (docs/flows/social-posting.md S1–S5), kept free of I/O so New post and the server check them the
 * same way. Only what each app's API offers: Meta has no private ("Only me") posts for Facebook, Instagram or Threads.
 */
import { REEL_SECONDS, aboveTags, hashtags, type Platform } from "./rules.ts";

export type ReplyControl = "everyone" | "accounts_you_follow" | "followers_only" | "mentioned_only";
export const REPLY_CONTROLS: [ReplyControl, string][] = [["everyone", "Everyone"], ["accounts_you_follow", "Accounts you follow"], ["followers_only", "Your followers"], ["mentioned_only", "Only accounts you mention"]];
export type TrialMode = "off" | "manual" | "auto";

/**
 * A Facebook Page mentioned in a Facebook caption (S7): Facebook needs its ID; the name is what people see; the link name
 * (facebook.com/ShopeeMY) is another way to type it.
 */
export type PageMention = { id: string; name: string; username?: string };
export type FacebookSettings = { draft: boolean; mentions: PageMention[] };
export type InstagramSettings = { feed: boolean; collaborators: string[]; tags: string[]; trial: TrialMode };
export type ThreadsSettings = { replies: ReplyControl; topic: string };
export type Settings = { facebook: FacebookSettings; instagram: InstagramSettings; threads: ThreadsSettings };
export const DEFAULT_SETTINGS: Settings = { facebook: { draft: false, mentions: [] }, instagram: { feed: true, collaborators: [], tags: [], trial: "off" }, threads: { replies: "everyone", topic: "" } };

export const COLLABORATORS_MAX = 3;
export const MENTIONS_MAX = 10;
/** People tagged in a Reel (Instagram's own limit in the app). */
export const TAGS_MAX = 20;
export const TOPIC_MAX = 50;
const USERNAME = /^[a-z0-9._]{1,30}$/;

/** Instagram usernames from what was typed ("@a, b c"): the valid ones, lower case, up to 3; `bad` lists the rest. */
export function parseCollaborators(input: string | string[]): { list: string[]; bad: string[] } {
  const parts = (Array.isArray(input) ? input : input.split(/[\s,]+/)).map((s) => String(s).trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
  const list: string[] = [], bad: string[] = [];
  for (const p of parts) {
    if (!USERNAME.test(p)) bad.push(p);
    else if (!list.includes(p)) list.push(p);
  }
  return { list, bad };
}

/** A Threads topic as Threads takes it: no #, no periods or ampersands, 1–50 characters (empty = no topic). */
export const cleanTopic = (s: string) => s.trim().replace(/^#+/, "").replace(/[.&]/g, "").replace(/\s+/g, " ").trim().slice(0, TOPIC_MAX);

/** The topic Rezekii suggests for Threads: the main caption's first hashtag. */
export const threadsTopic = (main: string) => cleanTopic(hashtags(main)[0] ?? "");

/** What the server keeps for one channel post, from what the browser sent (anything unknown falls back to the default). */
export function cleanSettings(platform: Platform, raw: unknown): FacebookSettings | InstagramSettings | ThreadsSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (platform === "facebook") return { draft: r.draft === true, mentions: cleanMentions(r.mentions) };
  if (platform === "instagram") {
    const trial = r.trial === "manual" || r.trial === "auto" ? r.trial : "off";
    const names = (k: string) => parseCollaborators(Array.isArray(r[k]) ? (r[k] as string[]) : []).list;
    return { feed: r.feed !== false, collaborators: names("collaborators").slice(0, COLLABORATORS_MAX), tags: names("tags").slice(0, TAGS_MAX), trial };
  }
  const replies = REPLY_CONTROLS.some(([v]) => v === r.replies) ? (r.replies as ReplyControl) : "everyone";
  return { replies, topic: cleanTopic(typeof r.topic === "string" ? r.topic : "") };
}

/** Plain-language problems with a channel's settings that block scheduling (empty = OK). */
export function settingsProblems(platform: Platform, s: Partial<Settings[Platform]>, durationSec?: number | null, collaboratorsTyped?: string, tagsTyped?: string): string[] {
  const out: string[] = [];
  if (platform === "facebook" && (s as FacebookSettings).draft && durationSec != null && (durationSec < REEL_SECONDS.min || durationSec > REEL_SECONDS.max))
    out.push("Facebook drafts work for Reels only (videos of 3–90 seconds). Choose Publish, or use a shorter video.");
  if (platform === "instagram" && collaboratorsTyped !== undefined) {
    const { list, bad } = parseCollaborators(collaboratorsTyped);
    if (bad.length) out.push(`Instagram collaborators: "${bad[0]}" isn't an Instagram username.`);
    if (list.length > COLLABORATORS_MAX) out.push(`Instagram allows up to ${COLLABORATORS_MAX} collaborators.`);
  }
  if (platform === "instagram" && tagsTyped !== undefined) {
    const { list, bad } = parseCollaborators(tagsTyped);
    if (bad.length) out.push(`Instagram tagged people: "${bad[0]}" isn't an Instagram username.`);
    if (list.length > TAGS_MAX) out.push(`Instagram allows up to ${TAGS_MAX} tagged people.`);
  }
  return out;
}

function cleanMentions(raw: unknown): PageMention[] {
  if (!Array.isArray(raw)) return [];
  const out: PageMention[] = [];
  for (const m of raw as { id?: unknown; name?: unknown; username?: unknown }[]) {
    const id = String(m?.id ?? ""), name = typeof m?.name === "string" ? m.name.trim().slice(0, 100) : "";
    const username = typeof m?.username === "string" && /^[A-Za-z0-9.]{2,50}$/.test(m.username) ? m.username : "";
    if (/^\d{5,20}$/.test(id) && name && !out.some((o) => o.id === id)) out.push(username ? { id, name, username } : { id, name });
  }
  return out.slice(0, MENTIONS_MAX);
}

/** Pages affiliates mention most, so nobody has to look up their ID (from each Page's transparency section, 20 Oct 2026). */
export const COMMON_PAGES: PageMention[] = [{ id: "1544653935786928", name: "Shopee", username: "ShopeeMY" }, { id: "296717127062813", name: "Lazada", username: "LazadaMalaysia" }];

// "@Name" or "@username" as a whole word, in any case: "@Shopee." and "@shopeemy" count; "@Shopeemall" and "@lazada.my" don't.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function mentionRe(m: PageMention): RegExp {
  const alts = [m.name, m.username].filter((s): s is string => !!s).sort((a, b) => b.length - a.length).map(escapeRe);
  return new RegExp(`@(?:${alts.join("|")})(?![\\p{L}\\p{N}_]|\\.[\\p{L}\\p{N}])`, "giu");
}

/** The Pages whose @name or @username is typed in the caption: they're mentioned there without picking them (S7). */
export function mentionsInText(text: string, pages: PageMention[]): PageMention[] {
  const out: PageMention[] = [];
  for (const m of pages) if (!out.some((o) => o.id === m.id) && mentionRe(m).test(text)) out.push(m);
  return out;
}

/** Quick picks under Mention Pages: Pages mentioned before, then the common ones; not already added, matching a typed name. */
export function mentionPicks(recent: PageMention[], added: PageMention[], typed: string, max = 8): PageMention[] {
  const q = typed.trim().toLowerCase();
  const seen = new Set(added.map((m) => m.id));
  const out: PageMention[] = [];
  for (const m of [...recent, ...COMMON_PAGES]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    if (!q || m.name.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)) out.push(m);
  }
  return out.slice(0, max);
}

/** A Facebook Page as pasted: its ID when the link carries one (or it's typed alone), otherwise its username. */
export function pageRef(input: string): { id: string } | { username: string } | null {
  const s = input.trim();
  if (/^\d{5,20}$/.test(s)) return { id: s };
  const id = s.match(/[?&]id=(\d{5,20})/) ?? s.match(/\/people\/[^/]+\/(\d{5,20})/) ?? s.match(/facebook\.com\/(\d{5,20})(?:[/?#]|$)/i);
  if (id) return { id: id[1] };
  const user = s.match(/(?:facebook|fb)\.com\/(?!profile\.php|people\/|pages\/|groups\/|share\/)([A-Za-z0-9.]{3,50})/i) ?? s.match(/^@?([A-Za-z0-9.]{3,50})$/);
  return user ? { username: user[1] } : null;
}

/**
 * A Facebook caption with its Page mentions: each where "@Page Name" was typed, otherwise at the end above the hashtags.
 * `as` writes each mention: Facebook's @[page-id] when posting, the Page's name in the preview.
 */
export function withPageMentions(caption: string, mentions: PageMention[], as: (m: PageMention) => string = (m) => `@[${m.id}]`): string {
  let text = caption;
  const missing: PageMention[] = [];
  for (const m of [...mentions].sort((a, b) => b.name.length - a.name.length)) {
    if (mentionRe(m).test(text)) text = text.replace(mentionRe(m), () => as(m));
    else missing.push(m);
  }
  return missing.length ? aboveTags(text, missing.map(as).join(" ")) : text;
}

/** The usernames in Instagram's "The following user(s) cannot be accessed: a, b" (a tag or collaborator it can't reach). */
export function unreachableUsers(message: string): string[] {
  const m = message.match(/cannot be accessed:\s*(.+)$/i);
  return m ? m[1].split(/[\s,]+/).map((u) => u.replace(/^@/, "").replace(/[.]$/, "").toLowerCase()).filter(Boolean) : [];
}
