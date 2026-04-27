/**
 * GET /api/tiktok/videos
 * Proxy to TikTok Display API video list.
 * Returns mock data when access token is not provided.
 *
 * Note: The Display API access token is per-user and must be obtained
 * via TikTok Login Kit OAuth flow. Pass it as a Bearer token or
 * store it server-side per authenticated user session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserVideos, getUserInfo, isMockMode } from "@/lib/tiktok-display";

export async function GET(req: NextRequest) {
  // In production: retrieve the user's stored Display API access token
  // from your session/database. For now, fall back to mock data.
  const authHeader  = req.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  try {
    const [videos, userInfo] = await Promise.all([
      getUserVideos(accessToken),
      getUserInfo(accessToken),
    ]);

    return NextResponse.json({
      success: true,
      mock:    isMockMode || !accessToken,
      data:    { videos, userInfo },
    });
  } catch (err) {
    console.error("[/api/tiktok/videos] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
