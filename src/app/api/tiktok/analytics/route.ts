/**
 * GET /api/tiktok/analytics?start=YYYYMMDD&end=YYYYMMDD
 * Proxy to TikTok Shop order/sales analytics.
 * Returns mock data when credentials are not configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrderAnalytics, isConfigured } from "@/lib/tiktok-shop";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start") ?? undefined;
  const end   = searchParams.get("end")   ?? undefined;

  try {
    const analytics = await getOrderAnalytics(
      undefined,
      start && end ? { start, end } : undefined,
    );
    return NextResponse.json({
      success: true,
      mock:    !isConfigured(),
      data:    analytics,
    });
  } catch (err) {
    console.error("[/api/tiktok/analytics] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
