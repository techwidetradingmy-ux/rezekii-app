/**
 * GET /api/tiktok/videos
 * Fetches the authenticated user's TikTok video list from the Open Platform API.
 * Reads the access token from the tiktok_token cookie (set during OAuth callback).
 * Returns { success, mock, data: { videos } }.
 * mock=true means the token was absent or the API call failed — caller shows demo data.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const FIELDS = [
  "id",
  "title",
  "video_description",
  "view_count",
  "like_count",
  "share_count",
  "comment_count",
  "cover_image_url",
  "duration",
  "create_time",
].join(",");

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideo(v: any) {
  const createTime: number = v.create_time ?? 0;
  return {
    id: String(v.id),
    title: v.title || v.video_description || "Untitled",
    views: fmt(v.view_count ?? 0),
    likes: fmt(v.like_count ?? 0),
    shares: fmt(v.share_count ?? 0),
    imageUrl: v.cover_image_url ?? "",
    duration: v.duration ?? 0,
    date: createTime
      ? new Date(createTime * 1000).toLocaleDateString("en-MY", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
    platform: "video" as const,
    // Shop GMV/commission are not available via Open Platform — caller shows "—"
    gmv: 0,
    commission: 0,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("tiktok_token")?.value;

  if (!token) {
    return NextResponse.json({ success: true, mock: true, data: { videos: [] } });
  }

  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${FIELDS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 20 }),
      },
    );

    if (!res.ok) {
      console.error("[/api/tiktok/videos] HTTP", res.status, await res.text());
      return NextResponse.json({ success: true, mock: true, data: { videos: [] } });
    }

    const json = await res.json();

    // TikTok returns error.code = "ok" on success
    if (json.error?.code && json.error.code !== "ok") {
      console.error("[/api/tiktok/videos] TikTok error:", JSON.stringify(json.error));
      return NextResponse.json({ success: true, mock: true, data: { videos: [] } });
    }

    const rawVideos: unknown[] = json.data?.videos ?? [];
    const videos = rawVideos.map(mapVideo);

    return NextResponse.json({ success: true, mock: false, data: { videos } });
  } catch (err) {
    console.error("[/api/tiktok/videos] Unexpected error:", err);
    return NextResponse.json({ success: true, mock: true, data: { videos: [] } });
  }
}
