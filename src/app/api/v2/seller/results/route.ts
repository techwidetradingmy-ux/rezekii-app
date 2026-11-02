import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { tapResults, type TapResults } from "@/modules/seller/tap-results.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cache = new Map<string, { at: number; r: TapResults | null }>();

/** Her products' TAP results (owner, 31 Oct 2026: real data), lifetime totals from TikTok. Kept 30 minutes. */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r ?? { linked: false });
  try {
    const r = await tapResults(user);
    cache.set(user.id, { at: Date.now(), r });
    return NextResponse.json(r ?? { linked: false }, { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[seller] results failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: t("Couldn't reach TikTok Shop. Please try again.") }, { status: 502 });
  }
}
