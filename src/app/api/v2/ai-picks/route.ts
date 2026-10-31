import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { aiPicks, type AiResult } from "@/modules/picks/ai.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const cache = new Map<string, { at: number; r: AiResult }>();

/** AI Picks (owner, 31 Oct 2026): her account analysed from the last 30 days, and the products that fit her best. Kept 30 minutes; ?fresh=1 again. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false });
  await keepFresh(user.id, ["orders"]);
  const r = await aiPicks(user.id, token, user.tiktok_username ?? null);
  cache.set(user.id, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
