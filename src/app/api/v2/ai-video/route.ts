import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { PLATFORMS, VIDEO_TYPES } from "@/lib/mock-ai-video";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type Row = { types: string[]; videos: number; platforms: string[]; note: string | null; joined_at: string };

/** Her place: everyone who joined before her, plus one. */
async function spotOf(joinedAt: string): Promise<number> {
  const res = await supabaseRest(`ai_video_waitlist?joined_at=lt.${encodeURIComponent(joinedAt)}&select=user_id`, { headers: { prefer: "count=exact", range: "0-0" } });
  return (Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0) + 1;
}
async function entryOf(userId: string) {
  const [row] = (await (await supabaseRest(`ai_video_waitlist?user_id=eq.${userId}&select=types,videos,platforms,note,joined_at&limit=1`)).json()) as Row[];
  if (!row) return null;
  return { types: row.types, videos: row.videos, platforms: row.platforms, ...(row.note ? { note: row.note } : {}), spot: await spotOf(row.joined_at) };
}

/** AI Video waitlist (owner, 31 Oct 2026: real storage): her answers and place, or null before she joins. */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  return NextResponse.json({ entry: await entryOf(user.id) }, { headers: { "cache-control": "private, no-store" } });
}

/** Joins the waitlist, or changes her answers (she keeps her place). */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { types?: unknown; videos?: unknown; platforms?: unknown; note?: unknown };
  const types = VIDEO_TYPES.filter((t) => Array.isArray(b.types) && b.types.includes(t));
  const platforms = PLATFORMS.filter((p) => Array.isArray(b.platforms) && b.platforms.includes(p));
  const videos = Math.round(Number(b.videos));
  if (!types.length) return NextResponse.json({ error: t("Pick at least 1 type of video.") }, { status: 400 });
  if (!platforms.length) return NextResponse.json({ error: t("Pick at least 1 platform.") }, { status: 400 });
  if (!(videos >= 1 && videos <= 60)) return NextResponse.json({ error: t("Choose 1 to 60 videos a month.") }, { status: 400 });
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 200) || null : null;
  const res = await supabaseRest("ai_video_waitlist?on_conflict=user_id", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    // joined_at is left out so a change keeps her place.
    body: JSON.stringify({ user_id: user.id, types, videos, platforms, note, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return NextResponse.json({ error: t("Didn't save. Please try again.") }, { status: 500 });
  return NextResponse.json({ entry: await entryOf(user.id) });
}
