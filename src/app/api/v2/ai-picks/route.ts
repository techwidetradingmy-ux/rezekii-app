import { NextResponse, type NextRequest } from "next/server";
import { detailsMissing } from "@/modules/rewards/profiles.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { aiPicks } from "@/modules/picks/ai.ts";
import type { Channel } from "@/modules/picks/mine.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const cache = new Map<string, { at: number; r: Awaited<ReturnType<typeof aiPicks>> }>();

/**
 * AI Picks (owner, 31 Oct 2026): her account analysed from the last 30 days, and the products that fit her best.
 * ?channel=all|video|live (Overall by default). Kept 30 minutes; ?fresh=1 again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = req.nextUrl.searchParams.get("channel");
  const channel: Channel = q === "video" || q === "live" ? q : "all";
  // Locked until her details are complete (owner, 31 Oct 2026).
  const missing = await detailsMissing(user.id).catch(() => null);
  if (missing) return NextResponse.json({ linked: true, locked: missing });
  const key = `${user.id}:${channel}`;
  const hit = cache.get(key);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false });
  await keepFresh(user.id, ["orders"]);
  const r = await aiPicks(user.id, token, user.tiktok_username ?? null, channel);
  cache.set(key, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
