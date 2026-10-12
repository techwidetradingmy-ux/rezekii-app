import { NextResponse, type NextRequest } from "next/server";
import { isTimerToken } from "@/modules/posting/store.ts";
import { runRefresh } from "@/modules/refresh/runner.ts";
import { storedSessions } from "@/modules/refresh/sessions.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every minute by the Supabase timer (same Vault token as /api/cron/posts). Works through the day's
 * market-data refresh for about 45 seconds, so one tick ends before the next begins.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!(await isTimerToken(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runRefresh(storedSessions(), Date.now() + 45_000));
}
