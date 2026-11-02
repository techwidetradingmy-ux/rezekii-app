import { NextResponse } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { bestTime } from "@/modules/stats/best-time.ts";

export const dynamic = "force-dynamic";

/**
 * Best time to post, from her own saved data and TikTok's best-selling videos (owner, 3 Nov 2026: settled videos only, typical
 * views and range per slot, 30 or 60 days by which matched her past posts better, best sellers in her category): one call.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await keepFresh(user.id);
  return NextResponse.json(await bestTime(user.id));
}
