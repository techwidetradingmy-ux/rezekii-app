import { after, NextResponse, type NextRequest } from "next/server";
import { isTimerToken } from "@/modules/posting/store.ts";
import { runRefresh } from "@/modules/refresh/runner.ts";
import { storedSessions } from "@/modules/refresh/sessions.ts";
import { warmDue, warmSite } from "@/modules/refresh/warm.ts";

export const dynamic = "force-dynamic";
// The once-a-day Rankings build takes over a minute: with a 60 s limit it was cut off on every try from 17 Oct (owner, 23 Oct
// 2026). Other ticks stop starting work after 30-45 s, as before.
export const maxDuration = 120;

/**
 * Called by the Supabase timer (same Vault token as /api/cron/posts): every minute while refresh tasks are due, and every
 * quarter hour anyway (see refresh_work_due). Works through the day's market-data refresh for about 45 seconds, so one tick
 * ends before the next begins.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!(await isTimerToken(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Every 15 minutes in the day, once this tick has answered: open the site's pages so a creator's first visit isn't slow. The
  // warm-up takes up to 20 s after the answer, so that tick works for 30 s instead of 45 (and never starts the Rankings build).
  const now = Date.now();
  after(() => warmSite(req.nextUrl.origin, token, now).catch(() => 0));
  return NextResponse.json(await runRefresh(storedSessions(), now + (warmDue(now) ? 30_000 : 45_000)));
}
