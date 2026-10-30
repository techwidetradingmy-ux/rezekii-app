import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { feedFor, markRead, prefsOf, savePrefs, type Prefs, type Side } from "@/modules/notifications/feed.ts";

export const dynamic = "force-dynamic";

const sideOf = (v: unknown): Side => (v === "seller" ? "seller" : "creator");

/** Her notifications (?side=creator|seller), newest first, with what's unread. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const side = sideOf(req.nextUrl.searchParams.get("side"));
  if (req.nextUrl.searchParams.get("part") === "prefs") return NextResponse.json({ prefs: await prefsOf(user.id, side) }, { headers: { "cache-control": "private, no-store" } });
  const feed = await feedFor(user.id, side);
  if (req.nextUrl.searchParams.get("count")) return NextResponse.json({ unread: feed.unread }, { headers: { "cache-control": "private, no-store" } });
  return NextResponse.json(feed, { headers: { "cache-control": "private, no-store" } });
}

/** { side, id } marks one read; { side, all: true } marks everything read; { side, prefs } saves which topics she wants. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { side?: string; id?: unknown; all?: unknown; prefs?: Prefs };
  if (body.prefs && typeof body.prefs === "object") return NextResponse.json({ prefs: await savePrefs(user.id, sideOf(body.side), body.prefs) });
  const id = typeof body.id === "string" && body.id.length <= 200 ? body.id : null;
  if (!id && body.all !== true) return NextResponse.json({ error: "Say which one to mark read." }, { status: 400 });
  await markRead(user.id, sideOf(body.side), id);
  return NextResponse.json({ ok: true });
}
