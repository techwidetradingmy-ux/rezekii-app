import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { badgesFor } from "@/modules/rewards/badges.ts";
import { levelOf, levelPage } from "@/modules/levels/store.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Her level, TikTok Shop level, streak and badges (owner, 31 Oct 2026: real data), and this month's progress to Silver (owner,
 * 1 Nov 2026: either target; reaching one moves her up at once).
 */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  // Read in one go (owner, 3 Nov 2026: the tab was slow); the badges use the level the page settles on, as before.
  const pageP = levelPage(user.id, user.tiktok_username).catch(() => null);
  const [page, b] = await Promise.all([pageP, badgesFor(user.id, pageP.then((p) => p?.level ?? levelOf(user.id)), t)]);
  return NextResponse.json({ ...b, level: page?.level ?? b.level, silver: page?.silver ?? null }, { headers: { "cache-control": "private, no-store" } });
}
