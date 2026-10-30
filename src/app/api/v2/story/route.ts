import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { storyOf } from "@/modules/story/story.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cache = new Map<string, { day: string; pages: unknown }>();

/** Her Daily Story (owner, 31 Oct 2026: real data), made once per Malaysia day. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const day = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const hit = cache.get(user.id);
  if (hit?.day === day && !req.nextUrl.searchParams.get("fresh")) return NextResponse.json({ pages: hit.pages });
  const pages = await storyOf(user, req.nextUrl.origin);
  cache.set(user.id, { day, pages });
  return NextResponse.json({ pages }, { headers: { "cache-control": "private, no-store" } });
}
