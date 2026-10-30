import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { feedFor, markRead, type Side } from "@/modules/notifications/feed.ts";

export const dynamic = "force-dynamic";

const sideOf = (v: unknown): Side => (v === "seller" ? "seller" : "creator");

/** Her notifications (?side=creator|seller), newest first, with what's unread. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const feed = await feedFor(user.id, sideOf(req.nextUrl.searchParams.get("side")));
  if (req.nextUrl.searchParams.get("count")) return NextResponse.json({ unread: feed.unread }, { headers: { "cache-control": "private, no-store" } });
  return NextResponse.json(feed, { headers: { "cache-control": "private, no-store" } });
}

/** { side, id } marks one read; { side, all: true } marks everything read. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { side?: string; id?: unknown; all?: unknown };
  const id = typeof body.id === "string" && body.id.length <= 200 ? body.id : null;
  if (!id && body.all !== true) return NextResponse.json({ error: "Say which one to mark read." }, { status: 400 });
  await markRead(user.id, sideOf(body.side), id);
  return NextResponse.json({ ok: true });
}
