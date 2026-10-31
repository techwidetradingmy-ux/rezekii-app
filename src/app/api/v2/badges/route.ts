import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { badgesFor } from "@/modules/rewards/badges.ts";
import { levelPage } from "@/modules/levels/store.ts";

export const dynamic = "force-dynamic";

/**
 * Her level, TikTok Shop level, streak and badges (owner, 31 Oct 2026: real data), and this month's progress to Silver (owner,
 * 1 Nov 2026: either target; reaching one moves her up at once).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const page = await levelPage(user.id, user.tiktok_username).catch(() => null);
  const b = await badgesFor(user.id);
  return NextResponse.json({ ...b, level: page?.level ?? b.level, silver: page?.silver ?? null }, { headers: { "cache-control": "private, no-store" } });
}
