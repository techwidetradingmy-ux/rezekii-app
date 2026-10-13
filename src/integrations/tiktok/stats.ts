/**
 * TikTok Display API reads for the creator's own account, with their Login Kit token:
 * account totals (scope user.info.stats) and their videos with views and likes (scope video.list).
 */
const API = "https://open.tiktokapis.com/v2";

type Envelope<T> = { data?: T; error?: { code: string; message: string } };
export type StatsReply<T> = { data?: T; error?: string };

async function call<T>(token: string, path: string, body?: unknown): Promise<StatsReply<T>> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=UTF-8" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as Envelope<T>;
    const e = json.error;
    if (e && e.code !== "ok") return { error: `${e.code}: ${e.message}` };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: json.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export type AccountStats = { follower_count?: number; following_count?: number; likes_count?: number; video_count?: number };

export async function getAccountStats(token: string): Promise<StatsReply<AccountStats>> {
  const r = await call<{ user?: AccountStats }>(token, "/user/info/?fields=follower_count,following_count,likes_count,video_count");
  return { data: r.data?.user, error: r.error };
}

export type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  duration?: number;
};

const VIDEO_FIELDS = "id,title,video_description,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count";

/** The creator's newest videos (up to 20). TikTok only lists videos others can see; "Only me" posts are left out. */
export async function listRecentVideos(token: string, max = 12): Promise<StatsReply<TikTokVideo[]>> {
  const r = await call<{ videos?: TikTokVideo[] }>(token, `/video/list/?fields=${VIDEO_FIELDS}`, { max_count: Math.min(20, max) });
  return { data: r.data?.videos ?? (r.error ? undefined : []), error: r.error };
}

/** One page of the account's public videos, newest first (for the daily video stats). `cursor` comes from the previous page. */
export async function listVideosPage(token: string, cursor?: number): Promise<StatsReply<{ videos: TikTokVideo[]; cursor?: number; has_more?: boolean }>> {
  const r = await call<{ videos?: TikTokVideo[]; cursor?: number; has_more?: boolean }>(token, `/video/list/?fields=${VIDEO_FIELDS},duration`, { max_count: 20, ...(cursor ? { cursor } : {}) });
  return { data: r.data ? { videos: r.data.videos ?? [], cursor: r.data.cursor, has_more: r.data.has_more } : undefined, error: r.error };
}

/** Views and likes for specific videos (up to 20 ids), e.g. the ones posted through Rezekii. */
export async function queryVideos(token: string, ids: string[]): Promise<StatsReply<TikTokVideo[]>> {
  if (!ids.length) return { data: [] };
  const r = await call<{ videos?: TikTokVideo[] }>(token, `/video/query/?fields=${VIDEO_FIELDS}`, { filters: { video_ids: ids.slice(0, 20) } });
  return { data: r.data?.videos ?? (r.error ? undefined : []), error: r.error };
}

/** 24300 → "24.3K", 1250000 → "1.3M", 312000 → "312K". */
export function shortCount(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  const fmt = (v: number, unit: string) => `${v.toFixed(v < 100 ? 1 : 0).replace(/\.0$/, "")}${unit}`;
  if (n >= 1e6) return fmt(n / 1e6, "M");
  if (n >= 1e3) return fmt(n / 1e3, "K");
  return String(n);
}
