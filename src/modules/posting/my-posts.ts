import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TikTokVideo } from "../../integrations/tiktok/stats.ts";
import { listPosts, postedVideoIds, userTikTokOpenId, type PostRow } from "./store.ts";

export type PostNumbers = Record<string, { views?: number; likes?: number; url?: string }>;
export type MyPostsData = { posts: PostRow[]; now: number; stats: { videos: TikTokVideo[]; posts: PostNumbers } };
type Saved = { video_id: string; title: string | null; cover: string | null; share_url: string | null; created_at: string | null; duration: number | null; views: number; likes: number; comments: number; shares: number };

const SELECT = "video_id,title,cover,share_url,created_at,duration,views,likes,comments,shares";
const saved = async (path: string): Promise<Saved[]> => {
  const res = await supabaseRest(path);
  return res.ok ? res.json() : [];
};

/**
 * My posts, ready to show at once: the posts, plus views and likes saved by the daily video job (tiktok_videos).
 * The browser then asks TikTok for the latest numbers in the background.
 */
export async function myPostsData(userId: string): Promise<MyPostsData> {
  const [posts, openId, posted] = await Promise.all([listPosts(userId), userTikTokOpenId(userId), postedVideoIds(userId)]);
  const ids = posted.map((p) => p.tiktok_post_id).filter((id) => /^\d+$/.test(id));
  const [recent, ours] = await Promise.all([
    openId ? saved(`tiktok_videos?open_id=eq.${encodeURIComponent(openId)}&select=${SELECT}&order=created_at.desc&limit=6`) : [],
    ids.length ? saved(`tiktok_videos?video_id=in.(${ids.join(",")})&select=${SELECT}`) : [],
  ]);
  const byVideo = new Map(ours.map((v) => [v.video_id, v]));
  const numbers: PostNumbers = {};
  for (const p of posted) {
    const v = byVideo.get(p.tiktok_post_id);
    if (v) numbers[p.id] = { views: Number(v.views), likes: Number(v.likes), url: v.share_url ?? undefined };
  }
  return {
    posts,
    now: Date.now(),
    stats: {
      videos: recent.map((v) => ({
        id: v.video_id, title: v.title ?? undefined, cover_image_url: v.cover ?? undefined, share_url: v.share_url ?? undefined,
        create_time: v.created_at ? Math.floor(Date.parse(v.created_at) / 1000) : undefined, duration: v.duration ?? undefined,
        view_count: Number(v.views), like_count: Number(v.likes), comment_count: Number(v.comments), share_count: Number(v.shares),
      })),
      posts: numbers,
    },
  };
}
