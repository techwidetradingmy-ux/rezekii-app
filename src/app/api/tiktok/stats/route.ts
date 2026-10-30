import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getAccountStats, listRecentVideos, queryVideos } from "@/integrations/tiktok/stats.ts";
import { freshTikTokToken, postedVideoIds, userTikTokOpenId } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";

/**
 * The signed-in creator's TikTok numbers: account totals (user.info.stats) and, with ?videos=1, their newest videos
 * plus views and likes for posts sent through Rezekii (video.list). Loaded by the browser so pages open without waiting on TikTok.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const openId = await userTikTokOpenId(user.id);
  if (!openId) return NextResponse.json({ account: null, videos: [], posts: {} });
  const token = await freshTikTokToken(openId);
  const withVideos = req.nextUrl.searchParams.get("videos") === "1";
  const [account, recent, posted] = await Promise.all([
    getAccountStats(token),
    withVideos ? listRecentVideos(token, 6) : null,
    withVideos ? postedVideoIds(user.id) : [],
  ]);
  const posts: Record<string, { views?: number; likes?: number; url?: string }> = {};
  if (posted.length) {
    const found = await queryVideos(token, posted.map((p) => p.tiktok_post_id));
    const byVideo = new Map((found.data ?? []).map((v) => [v.id, v]));
    for (const p of posted) {
      const v = byVideo.get(p.tiktok_post_id);
      if (v) posts[p.id] = { views: v.view_count, likes: v.like_count, url: v.share_url };
    }
  }
  return NextResponse.json(
    { account: account.data ?? null, videos: recent?.data ?? [], posts, error: account.error ?? recent?.error ?? null },
    { headers: { "cache-control": "private, no-store" } },
  );
}
