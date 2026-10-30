/**
 * What was typed in New post, kept with each post so Reuse fills New post in again (M7). The video and the comment image
 * aren't kept (they're deleted once posted), nor the time. TikTok's privacy, interaction and disclosure choices aren't
 * kept either: TikTok wants them picked fresh every time.
 */
import { tiktokKey } from "./picker.ts";
import type { Channel, Placement } from "./rules.ts";
import { REPLY_CONTROLS, type ReplyControl, type TrialMode } from "./settings.ts";

export type Recipe = {
  channels: string[];
  main: string;
  tags: string;
  comment: string;
  link: string;
  cta: string;
  captions: Partial<Record<Channel, string>>;
  comments: Partial<Record<Channel, string>>;
  place: Partial<Record<Channel, Placement>>;
  topic: string | null;
  fbDraft: boolean;
  igFeed: boolean;
  igTrial: TrialMode;
  collaborators: string;
  tagged: string;
  replies: ReplyControl;
};

const APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads"];
const TEXT_MAX = 10_000;
const str = (v: unknown, max = TEXT_MAX) => (typeof v === "string" ? v.slice(0, max) : "");
function perApp<T>(raw: unknown, ok: (v: unknown) => v is T): Partial<Record<Channel, T>> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(APPS.filter((c) => ok(r[c])).map((c) => [c, r[c]])) as Partial<Record<Channel, T>>;
}
const isText = (v: unknown): v is string => typeof v === "string" && v.length <= TEXT_MAX;
const isPlace = (v: unknown): v is Placement => !!v && typeof v === "object" && typeof (v as Placement).caption === "boolean" && typeof (v as Placement).comment === "boolean";

/** A saved recipe as New post can use it; anything malformed falls back to New post's defaults. */
export function cleanRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const channels = Array.isArray(r.channels) ? [...new Set(r.channels.filter((k): k is string => typeof k === "string" && k.length <= 200))].slice(0, 100) : [];
  return {
    channels,
    main: str(r.main), tags: str(r.tags, 1000), comment: str(r.comment), link: str(r.link, 2000), cta: str(r.cta, 200),
    captions: perApp(r.captions, isText), comments: perApp(r.comments, isText), place: perApp(r.place, isPlace),
    topic: typeof r.topic === "string" ? r.topic.slice(0, 100) : null,
    fbDraft: r.fbDraft === true, igFeed: r.igFeed !== false,
    igTrial: r.igTrial === "manual" || r.igTrial === "auto" ? r.igTrial : "off",
    collaborators: str(r.collaborators, 500), tagged: str(r.tagged, 1000),
    replies: REPLY_CONTROLS.some(([v]) => v === r.replies) ? (r.replies as ReplyControl) : "everyone",
  };
}

type SocialRow = { account_id: string | null; platform: Exclude<Channel, "tiktok">; caption: string; first_comment: string; settings: Record<string, unknown> | null };

/**
 * For posts made before recipes were kept: each app's own caption and first comment as they went out, and its settings.
 * The separate Main, hashtag and link boxes can't be told apart any more, so they stay empty.
 */
export function recipeFromPosts(social: SocialRow[], tiktok: { tiktok_open_id: string; caption: string } | null): Recipe {
  const first = (p: Exclude<Channel, "tiktok">) => social.find((s) => s.platform === p);
  const captions: Partial<Record<Channel, string>> = {};
  const comments: Partial<Record<Channel, string>> = {};
  if (tiktok) captions.tiktok = tiktok.caption;
  for (const s of social) {
    captions[s.platform] ??= s.caption;
    if (s.first_comment.trim()) comments[s.platform] ??= s.first_comment;
  }
  const fb = first("facebook")?.settings ?? {}, ig = first("instagram")?.settings ?? {}, th = first("threads")?.settings ?? {};
  return cleanRecipe({
    channels: [...(tiktok ? [tiktokKey(tiktok.tiktok_open_id)] : []), ...social.map((s) => s.account_id).filter(Boolean)],
    main: tiktok?.caption || social[0]?.caption || "",
    captions, comments,
    fbDraft: fb.draft === true,
    igFeed: ig.feed !== false, igTrial: ig.trial,
    collaborators: Array.isArray(ig.collaborators) ? ig.collaborators.map((u) => `@${u}`).join(" ") : "",
    tagged: Array.isArray(ig.tags) ? ig.tags.map((u) => `@${u}`).join(" ") : "",
    replies: th.replies, topic: typeof th.topic === "string" && th.topic ? th.topic : null,
  }) as Recipe;
}
