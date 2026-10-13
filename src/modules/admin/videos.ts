import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listVideosPage } from "../../integrations/tiktok/stats.ts";
import { freshTikTokToken } from "../posting/store.ts";

const KEEP_DAYS = 90;
const MAX_PAGES = 8;

/**
 * Daily: every connected account's public videos from the last 90 days with their numbers, saved to tiktok_videos.
 * Goes account by account from `start`; returns where to carry on (`next`) when `stopAt` comes first. Older videos are dropped at the end.
 */
export async function refreshVideos(start: number, stopAt: number): Promise<{ count: number; next: number | null }> {
  const conns = (await (await supabaseRest("tiktok_connections?select=open_id,username,refresh_token_expires_at&order=open_id&limit=2000")).json()) as { open_id: string; username: string | null; refresh_token_expires_at: string }[];
  const oldest = Date.now() / 1000 - KEEP_DAYS * 86400;
  let count = 0;
  for (let i = start; i < conns.length; i++) {
    if (Date.now() > stopAt) return { count, next: i };
    const c = conns[i];
    if (Date.parse(c.refresh_token_expires_at) < Date.now()) continue;
    let token: string;
    try {
      token = await freshTikTokToken(c.open_id);
    } catch (err) {
      console.error("[videos] token", c.username, err instanceof Error ? err.message : err);
      continue;
    }
    let cursor: number | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await listVideosPage(token, cursor);
      if (r.error || !r.data) {
        console.error("[videos] list", c.username, r.error);
        break;
      }
      const recent = r.data.videos.filter((v) => (v.create_time ?? 0) >= oldest);
      if (recent.length) {
        const now = new Date().toISOString();
        await supabaseRest("tiktok_videos?on_conflict=video_id", {
          method: "POST",
          headers: { prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(recent.map((v) => ({
            video_id: v.id, open_id: c.open_id, username: c.username, title: (v.title || v.video_description || "").slice(0, 300), cover: v.cover_image_url ?? null, share_url: v.share_url ?? null,
            duration: v.duration ?? null, created_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
            views: v.view_count ?? 0, likes: v.like_count ?? 0, comments: v.comment_count ?? 0, shares: v.share_count ?? 0, updated_at: now,
          }))),
        });
        count += recent.length;
      }
      if (!r.data.has_more || !r.data.cursor || recent.length < r.data.videos.length) break;
      cursor = r.data.cursor;
    }
  }
  await supabaseRest(`tiktok_videos?created_at=lt.${new Date(oldest * 1000).toISOString()}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  return { count, next: null };
}

export type VideoRow = { id: string; openId: string; handle: string; title: string; cover: string | null; url: string | null; at: string | null; views: number; likes: number; comments: number; shares: number; viaRezekii: boolean };

/** Saved videos from the last `days` days (newest first) and when they were last refreshed. */
export async function savedVideos(days: number): Promise<{ rows: VideoRow[]; refreshedAt: string | null }> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [videos, posted] = await Promise.all([
    supabaseRest(`tiktok_videos?created_at=gte.${since}&select=*&order=created_at.desc&limit=3000`).then((r) => r.json() as Promise<{ video_id: string; open_id: string; username: string | null; title: string | null; cover: string | null; share_url: string | null; created_at: string | null; views: number; likes: number; comments: number; shares: number; updated_at: string }[]>),
    supabaseRest("posts?tiktok_post_id=not.is.null&select=tiktok_post_id&limit=10000").then((r) => r.json() as Promise<{ tiktok_post_id: string }[]>),
  ]);
  const ours = new Set(posted.map((p) => p.tiktok_post_id));
  return {
    rows: videos.map((v) => ({
      id: v.video_id, openId: v.open_id, handle: v.username ? `@${v.username}` : "TikTok account", title: v.title || "Untitled video", cover: v.cover, url: v.share_url, at: v.created_at,
      views: Number(v.views), likes: Number(v.likes), comments: Number(v.comments), shares: Number(v.shares), viaRezekii: ours.has(v.video_id),
    })),
    refreshedAt: videos.reduce<string | null>((m, v) => (!m || v.updated_at > m ? v.updated_at : m), null),
  };
}
