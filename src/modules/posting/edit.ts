import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { loadRecipe } from "../social/recipes.ts";
import type { Recipe } from "../social/recipe.ts";
import { cleanUpGroup, signedMediaUrl, type SocialPostRow } from "../social/store.ts";
import { deleteUpload } from "./media.ts";
import { getUserPost, type PostRow } from "./store.ts";

/**
 * Details and Edit for a post (owner, 23 Oct 2026): everything that was put in when it was scheduled can be checked, and
 * changed until it starts sending. A post is one TikTok post, or one New post's channel posts (a group) with or without
 * TikTok; `key` is the TikTok post's id or the group's id, as on My posts and All channels.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPEN = new Set(["scheduled", "draft"]);

type Parts = { tiktok: PostRow | null; channels: SocialPostRow[]; group: string | null };

/** The live parts of the post `key` (cancelled channel posts left out), or null when it isn't this user's. */
async function parts(userId: string, key: string): Promise<Parts | null> {
  if (!UUID.test(key)) return null;
  const asTikTok = await getUserPost(userId, key);
  const rows = (await (await supabaseRest(`social_posts?user_id=eq.${userId}&${asTikTok ? `tiktok_post_id=eq.${key}` : `group_id=eq.${key}`}&status=neq.cancelled&order=created_at`)).json()) as SocialPostRow[];
  const tiktok = asTikTok ?? (rows[0]?.tiktok_post_id ? await getUserPost(userId, rows[0].tiktok_post_id) : null);
  if (!tiktok && !rows.length) return null;
  return { tiktok: tiktok && tiktok.status !== "cancelled" ? tiktok : null, channels: rows, group: rows[0]?.group_id ?? null };
}

/** Every part is still scheduled or a draft, so nothing has gone out yet. */
const editable = (p: Parts) => (!p.tiktok || OPEN.has(p.tiktok.status)) && p.channels.every((c) => OPEN.has(c.status)) && (!!p.tiktok || p.channels.length > 0);
const signed = (path: string | null | undefined) => (path ? signedMediaUrl(path, 3600).catch(() => null) : Promise.resolve(null));

export type PostDetails = {
  key: string;
  at: string | null;
  editable: boolean;
  /** `url` plays the video (a stored upload is gone once TikTok has posted it). */
  video: { source: "upload" | "link"; url: string | null; durationSec: number | null };
  tiktok: null | {
    id: string; account: string | null; status: PostRow["status"]; mode: PostRow["mode"]; caption: string; privacy: string | null;
    allowComments: boolean; allowDuet: boolean; allowStitch: boolean; brandOrganic: boolean; brandedContent: boolean; isAigc: boolean;
  };
  channels: { id: string; platform: SocialPostRow["platform"]; name: string; status: SocialPostRow["status"]; caption: string; firstComment: string; commentImage: string | null; settings: Record<string, unknown> }[];
};

/** Everything the post was scheduled with, for its Details. */
export async function postDetails(userId: string, key: string): Promise<PostDetails | null> {
  const p = await parts(userId, key);
  if (!p) return null;
  const first = p.channels[0];
  const source = p.tiktok?.source ?? first?.source ?? "upload";
  const [url, account, ...images] = await Promise.all([
    source === "link" ? Promise.resolve(p.tiktok?.link_url ?? first?.link_url ?? null) : signed(p.tiktok?.storage_path ?? first?.storage_path),
    p.tiktok ? supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(p.tiktok.tiktok_open_id)}&select=username&limit=1`).then(async (r) => ((await r.json()) as { username: string | null }[])[0]?.username ?? null) : Promise.resolve(null),
    ...p.channels.map((c) => signed(c.comment_image_path)),
  ]);
  const t = p.tiktok;
  return {
    key,
    at: t?.status === "posted" ? t.posted_at : (t?.scheduled_at ?? first?.scheduled_at ?? first?.posted_at ?? null),
    editable: editable(p),
    video: { source, url, durationSec: t?.duration_sec ?? first?.duration_sec ?? null },
    tiktok: t && {
      id: t.id, account: account ? `@${account}` : null, status: t.status, mode: t.mode, caption: t.caption, privacy: t.privacy_level,
      allowComments: t.allow_comments, allowDuet: t.allow_duet, allowStitch: t.allow_stitch, brandOrganic: t.brand_organic, brandedContent: t.branded_content, isAigc: t.is_aigc,
    },
    channels: p.channels.map((c, i) => ({ id: c.id, platform: c.platform, name: c.account_name ?? c.platform, status: c.status, caption: c.caption, firstComment: c.first_comment, commentImage: images[i], settings: c.settings ?? {} })),
  };
}

export type EditPost = {
  key: string;
  /** The scheduled time, or null for a draft. */
  at: string | null;
  video: { source: "upload" | "link"; storagePath: string | null; linkUrl: string | null; url: string | null; durationSec: number | null };
  commentImage: { path: string; url: string | null } | null;
  tiktok: null | { account: string; mode: PostRow["mode"]; caption: string; privacy: string | null; allowComments: boolean; allowDuet: boolean; allowStitch: boolean; brandOrganic: boolean; brandedContent: boolean; isAigc: boolean };
  recipe: Recipe | null;
};

/** What New post starts from to edit a post: the post as it was scheduled, with its video kept. Null when it can't be edited. */
export async function loadEdit(userId: string, key: string): Promise<EditPost | null> {
  const p = await parts(userId, key);
  if (!p || !editable(p)) return null;
  const t = p.tiktok, first = p.channels[0];
  const source = t?.source ?? first?.source ?? "upload";
  const storagePath = source === "upload" ? (t?.storage_path ?? first?.storage_path ?? null) : null;
  const imagePath = p.channels.find((c) => c.comment_image_path)?.comment_image_path ?? null;
  const [url, imageUrl, saved] = await Promise.all([signed(storagePath), signed(imagePath), loadRecipe(userId, key).catch(() => null)]);
  return {
    key,
    at: t ? (t.status === "scheduled" ? t.scheduled_at : null) : first.status === "scheduled" ? first.scheduled_at : null,
    video: { source, storagePath, linkUrl: source === "link" ? (t?.link_url ?? first?.link_url ?? null) : null, url, durationSec: t?.duration_sec ?? first?.duration_sec ?? null },
    commentImage: imagePath ? { path: imagePath, url: imageUrl } : null,
    tiktok: t && { account: t.tiktok_open_id, mode: t.mode, caption: t.caption, privacy: t.privacy_level, allowComments: t.allow_comments, allowDuet: t.allow_duet, allowStitch: t.allow_stitch, brandOrganic: t.brand_organic, brandedContent: t.branded_content, isAigc: t.is_aigc },
    recipe: saved?.recipe ?? null,
  };
}

/** Whether a stored file is used by a post that isn't cancelled (so an edit copies it rather than sharing it). */
export async function fileInUse(path: string): Promise<boolean> {
  const either = encodeURIComponent(`(storage_path.eq."${path}",comment_image_path.eq."${path}")`);
  const [a, b] = await Promise.all([
    supabaseRest(`social_posts?or=${either}&status=neq.cancelled&select=id&limit=1`).then((r) => r.json() as Promise<unknown[]>),
    supabaseRest(`posts?storage_path=eq.${encodeURIComponent(path)}&status=neq.cancelled&select=id&limit=1`).then((r) => r.json() as Promise<unknown[]>),
  ]);
  return a.length + b.length > 0;
}

const patch = (path: string, body: Record<string, unknown>) =>
  supabaseRest(path, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }) }).then((r) => r.json() as Promise<{ id: string }[]>);

/**
 * Saving an edit: New post saved the changed post held (as a draft, with its time), and this puts it in the old one's place.
 * The old post is taken off only where it hasn't started sending; if any part already has, nothing changes, the held post is
 * dropped, and the old one goes out as it was.
 */
export async function swapPost(userId: string, oldKey: string, newKey: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const [old, next] = await Promise.all([parts(userId, oldKey), parts(userId, newKey)]);
  if (!old || !next || oldKey === newKey) return { ok: false, error: "That post wasn't found.", status: 404 };
  const drop = async () => {
    if (next.tiktok) await patch(`posts?id=eq.${next.tiktok.id}&status=eq.draft`, { status: "cancelled", next_attempt_at: null });
    if (next.group) {
      await patch(`social_posts?group_id=eq.${next.group}&status=eq.draft`, { status: "cancelled", next_attempt_at: null });
      await cleanUpGroup(next.group);
    }
  };
  const started = { ok: false as const, error: "It has already started sending, so it can't be changed now. Your changes weren't saved.", status: 409 };
  if (!editable(old)) return (await drop(), started);

  // Off the schedule, only where it hasn't started; anything taken off is put back if another part had started.
  const undo: (() => Promise<unknown>)[] = [];
  if (old.tiktok) {
    const t = old.tiktok;
    const done = await patch(`posts?id=eq.${t.id}&user_id=eq.${userId}&status=in.(scheduled,draft)`, { status: "cancelled", next_attempt_at: null });
    if (!done.length) return (await drop(), started);
    undo.push(() => patch(`posts?id=eq.${t.id}`, { status: t.status, next_attempt_at: t.next_attempt_at }));
  }
  for (const c of old.channels) {
    const done = await patch(`social_posts?id=eq.${c.id}&user_id=eq.${userId}&status=in.(scheduled,draft)`, { status: "cancelled", next_attempt_at: null });
    if (!done.length) {
      for (const u of undo) await u();
      return (await drop(), started);
    }
    undo.push(() => patch(`social_posts?id=eq.${c.id}`, { status: c.status, next_attempt_at: c.next_attempt_at }));
  }

  // The edited post goes on the schedule (a draft stays a draft).
  if (next.tiktok) await patch(`posts?id=eq.${next.tiktok.id}&status=eq.draft&scheduled_at=not.is.null`, { status: "scheduled" });
  if (next.group) await patch(`social_posts?group_id=eq.${next.group}&status=eq.draft&scheduled_at=not.is.null`, { status: "scheduled" });

  // The old post's stored files go when nothing uses them any more (a kept video is shared or was copied).
  if (old.group) await cleanUpGroup(old.group);
  const oldVideo = old.tiktok?.storage_path;
  if (oldVideo && !(await fileInUse(oldVideo))) await deleteUpload(oldVideo).catch(() => {});
  return { ok: true };
}
