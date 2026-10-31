import { NextResponse, type NextRequest } from "next/server";
import { detailsMissing } from "@/modules/rewards/profiles.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { levelOf } from "@/modules/levels/store.ts";
import { listDay, marketIdeas, showcaseIdeas, type TodayIdeas } from "@/modules/picks/today.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cache = new Map<string, { at: number; r: TodayIdeas }>();

/**
 * Today's Ideas (owner, 31 Oct 2026): ?source=market|showcase. What's selling most on TikTok Shop on the newest day TikTok has
 * published. A list is kept 30 minutes, and made again as soon as TikTok's newer list is saved; ?fresh=1 makes it again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const source = req.nextUrl.searchParams.get("source") === "showcase" ? "showcase" : "market";
  // Overall by default; Video from TikTok's top-selling videos (owner, 31 Oct 2026).
  const channel = req.nextUrl.searchParams.get("channel") === "video" ? "video" : "all";
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false, source, channel, day: null, listAt: null, rows: [], gold: false, at: new Date().toISOString() });
  // Locked until her details are complete (owner, 31 Oct 2026).
  const missing = await detailsMissing(user.id).catch(() => null);
  if (missing) return NextResponse.json({ linked: true, locked: missing, source, channel, day: null, listAt: null, rows: [], gold: false, at: new Date().toISOString() });
  const key = `${user.id}:${source}:${channel}`;
  const hit = cache.get(key);
  // A newer TikTok list makes a new one at once (owner, 31 Oct 2026: "update as soon as TikTok publishes").
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000 && hit.r.day === (await listDay())) return NextResponse.json({ linked: true, ...hit.r });
  const gold = (await levelOf(user.id).catch(() => "bronze")) === "gold";
  const r = source === "showcase" ? await showcaseIdeas(token, gold, channel) : await marketIdeas(token, gold, channel);
  cache.set(key, { at: Date.now(), r });
  return NextResponse.json({ linked: true, ...r }, { headers: { "cache-control": "private, no-store" } });
}
