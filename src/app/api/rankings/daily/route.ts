import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { dailyTop100 } from "@/modules/rankings/daily.ts";

export const dynamic = "force-dynamic";

/** Daily Top 100 Creators: TikTok's top 100 for one saved day (?date=YYYY-MM-DD, default the newest; &period=7D for Weekly), with history. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const d = req.nextUrl.searchParams.get("date") ?? undefined;
  const board = await dailyTop100(d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined, req.nextUrl.searchParams.get("period") === "7D" ? "7D" : "1D");
  if (!board) return NextResponse.json({ error: "TikTok's daily lists aren't saved yet." }, { status: 404 });
  return NextResponse.json({ ...board, me: user.tiktok_username?.toLowerCase() ?? null }, { headers: { "cache-control": "private, no-store" } });
}
