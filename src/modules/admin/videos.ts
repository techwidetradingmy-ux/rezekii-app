import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listVideosPage, queryVideos, type TikTokVideo } from "../../integrations/tiktok/stats.ts";
import { freshTikTokToken, markTikTokReconnect, TIKTOK_LOST } from "../posting/store.ts";
import { noteRead } from "../creator-accounts/fresh.ts";
import { AWAY_DAYS } from "../sales/orders.ts";

const KEEP_DAYS = 90;
const MAX_PAGES = 8;

/** A video as saved in tiktok_videos. */
const videoRow = (v: TikTokVideo, c: { open_id: string; username: string | null }, now: string) => ({
  video_id: v.id, open_id: c.open_id, username: c.username, title: (v.title || v.video_description || "").slice(0, 300), cover: v.cover_image_url ?? null, share_url: v.share_url ?? null,
  duration: v.duration ?? null, created_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
  views: v.view_count ?? 0, likes: v.like_count ?? 0, comments: v.comment_count ?? 0, shares: v.share_count ?? 0, updated_at: now,
});
const saveVideoRows = (rows: ReturnType<typeof videoRow>[]) =>
  supabaseRest("tiktok_videos?on_conflict=video_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });

/**
 * A video's views when it is about 1, 7 and 30 days old (owner, 3 Nov 2026: for "after 30 days" estimates once a month of data
 * exists), from the reads below, with no extra TikTok calls. Only an age just reached ([age, before]); the first reading in each
 * window is kept, and `at` says exactly when it was taken.
 */
const AGES: [number, number][] = [[1, 2], [7, 9], [30, 33]];
async function saveAges(vs: TikTokVideo[], openId: string, now: number): Promise<void> {
  const rows = vs.flatMap((v) => {
    const age = v.create_time ? (now / 1000 - v.create_time) / 86400 : -1;
    if (v.view_count == null) return [];
    return AGES.filter(([a, b]) => age >= a && age < b).map(([a]) => ({ video_id: v.id, age_days: a, open_id: openId, posted_at: new Date(v.create_time! * 1000).toISOString(), views: v.view_count, at: new Date(now).toISOString() }));
  });
  if (rows.length)
    await supabaseRest("video_views_at?on_conflict=video_id,age_days", { method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(rows) })
      .catch((err) => console.error("[videos] ages", err instanceof Error ? err.message : err));
}

/** Video ids already asked of TikTok on demand, so a deleted or private video isn't asked for again. */
const asked = new Set<string>();

/**
 * A creator's own videos that aren't saved (older than the daily list's 90 days, e.g. on Sales), asked of TikTok with their
 * sign-in (up to 20) and saved, so their titles and covers show.
 */
export async function fetchOwnVideos(userId: string, ids: string[]): Promise<ReturnType<typeof videoRow>[]> {
  const want = ids.filter((id) => !asked.has(id)).slice(0, 20);
  if (!want.length) return [];
  const [c] = (await (await supabaseRest(`tiktok_connections?user_id=eq.${userId}&select=open_id,username&limit=1`)).json()) as { open_id: string; username: string | null }[];
  if (!c) return [];
  want.forEach((id) => asked.add(id));
  const r = await queryVideos(await freshTikTokToken(c.open_id), want);
  const rows = (r.data ?? []).map((v) => videoRow(v, c, new Date().toISOString()));
  if (rows.length) await saveVideoRows(rows);
  return rows;
}

type Conn = { open_id: string; username: string | null; user_id: string | null; refresh_token_expires_at: string };

/**
 * One TikTok account's public videos posted after `oldest` (unix seconds), saved to tiktok_videos. Returns how many, or null when
 * TikTok didn't answer. A read that worked becomes the time her videos were last updated.
 */
async function readAccount(c: Conn, oldest: number): Promise<number | null> {
  let token: string;
  try {
    token = await freshTikTokToken(c.open_id);
  } catch (err) {
    console.error("[videos] token", c.username, err instanceof Error ? err.message : err);
    return null;
  }
  let count = 0;
  let cursor: number | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r = await listVideosPage(token, cursor);
    if (r.error || !r.data) {
      console.error("[videos] list", c.username, r.error);
      // TikTok no longer accepts the connection: it shows "Reconnect" (the error reads "<code>: <message>").
      if (r.error && TIKTOK_LOST.has(r.error.split(":")[0])) await markTikTokReconnect(c.open_id);
      return null;
    }
    const recent = r.data.videos.filter((v) => (v.create_time ?? 0) >= oldest);
    if (recent.length) {
      const now = new Date().toISOString();
      await saveVideoRows(recent.map((v) => videoRow(v, c, now)));
      await saveAges(recent, c.open_id, Date.parse(now));
      count += recent.length;
    }
    if (!r.data.has_more || !r.data.cursor || recent.length < r.data.videos.length) break;
    cursor = r.data.cursor;
  }
  if (c.user_id) await noteRead(c.user_id, "videos").catch(() => undefined);
  return count;
}

/** One creator's videos from the last 90 days, read now (when she links TikTok, or opens a page and they're old). */
export async function syncMyVideos(userId: string): Promise<number> {
  const conns = (await (await supabaseRest(`tiktok_connections?user_id=eq.${userId}&select=open_id,username,user_id,refresh_token_expires_at`)).json()) as Conn[];
  let count = 0;
  for (const c of conns) if (Date.parse(c.refresh_token_expires_at) > Date.now()) count += (await readAccount(c, Date.now() / 1000 - KEEP_DAYS * 86400)) ?? 0;
  return count;
}

/**
 * Daily: every connected account's public videos from the last 90 days with their numbers, saved to tiktok_videos.
 * Goes account by account from `start`; returns where to carry on (`next`) when `stopAt` comes first. Older videos are dropped at the end.
 */
export async function refreshVideos(start: number, stopAt: number): Promise<{ count: number; next: number | null }> {
  const conns = (await (await supabaseRest("tiktok_connections?select=open_id,username,user_id,refresh_token_expires_at&order=open_id&limit=2000")).json()) as Conn[];
  // Accounts whose owner used Rezekii in the last 14 days (owner, 2 Nov 2026); the others are read when they're back.
  const ids = [...new Set(conns.map((c) => c.user_id).filter((x): x is string => !!x))];
  const away = new Set<string>();
  for (let i = 0; i < ids.length; i += 150)
    for (const u of (await (await supabaseRest(`app_users?id=in.(${ids.slice(i, i + 150).join(",")})&select=id,last_seen_at`)).json()) as { id: string; last_seen_at: string | null }[])
      if (!u.last_seen_at || Date.parse(u.last_seen_at) < Date.now() - AWAY_DAYS * 86400_000) away.add(u.id);
  const oldest = Date.now() / 1000 - KEEP_DAYS * 86400;
  let count = 0;
  for (let i = start; i < conns.length; i++) {
    if (Date.now() > stopAt) return { count, next: i };
    const c = conns[i];
    if (Date.parse(c.refresh_token_expires_at) < Date.now() || (c.user_id && away.has(c.user_id))) continue;
    count += (await readAccount(c, oldest)) ?? 0;
  }
  await supabaseRest(`tiktok_videos?created_at=lt.${new Date(oldest * 1000).toISOString()}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  return { count, next: null };
}

export type VideoRow = { id: string; openId: string; handle: string; title: string; cover: string | null; url: string | null; at: string | null; views: number; likes: number; comments: number; shares: number; viaRezekii: boolean };

/** Saved videos from the last `days` days (newest first) and when they were last refreshed. */
export async function savedVideos(days: number): Promise<{ rows: VideoRow[]; refreshedAt: string | null; now: number }> {
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
    now: Date.now(),
  };
}
