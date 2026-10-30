import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { competitors, type Competitors } from "@/modules/seller/competitors.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cache = new Map<string, { at: number; r: Competitors }>();

/** Competitors in her categories, from Rezekii's TAP catalog (owner, 31 Oct 2026). Kept 30 minutes. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  try {
    const r = await competitors(user);
    cache.set(user.id, { at: Date.now(), r });
    return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[competitors]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't reach TikTok Shop. Please try again." }, { status: 502 });
  }
}
