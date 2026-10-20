/**
 * Post settings per app (docs/flows/social-posting.md S1–S5), kept free of I/O so New post and the server check them the
 * same way. Only what each app's API offers: Meta has no private ("Only me") posts for Facebook, Instagram or Threads.
 */
import { REEL_SECONDS, hashtags, type Platform } from "./rules.ts";

export type ReplyControl = "everyone" | "accounts_you_follow" | "followers_only" | "mentioned_only";
export const REPLY_CONTROLS: [ReplyControl, string][] = [["everyone", "Everyone"], ["accounts_you_follow", "Accounts you follow"], ["followers_only", "Your followers"], ["mentioned_only", "Only accounts you mention"]];
export type TrialMode = "off" | "manual" | "auto";

export type FacebookSettings = { draft: boolean };
export type InstagramSettings = { feed: boolean; collaborators: string[]; tags: string[]; trial: TrialMode };
export type ThreadsSettings = { replies: ReplyControl; topic: string };
export type Settings = { facebook: FacebookSettings; instagram: InstagramSettings; threads: ThreadsSettings };
export const DEFAULT_SETTINGS: Settings = { facebook: { draft: false }, instagram: { feed: true, collaborators: [], tags: [], trial: "off" }, threads: { replies: "everyone", topic: "" } };

export const COLLABORATORS_MAX = 3;
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
  if (platform === "facebook") return { draft: r.draft === true };
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
