import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cleanCreator, cleanSeller, profileOf, saveProfile } from "@/modules/rewards/profiles.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/** The saved creator profile or seller contact (?side=creator|seller), null before it's saved (owner, 31 Oct 2026). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ profile: await profileOf(user.id, req.nextUrl.searchParams.get("side") === "seller" ? "seller" : "creator") }, NO_STORE);
}

/** Saves it: { side, details }. A creator profile saves once; changes after that go through support. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { side?: string; details?: Record<string, unknown> };
  const side = b.side === "seller" ? "seller" : "creator";
  const details = side === "seller" ? cleanSeller(b.details ?? {}) : cleanCreator(b.details ?? {});
  if (!details) return NextResponse.json({ error: "Check the details and try again." }, { status: 400 });
  const r = await saveProfile(user.id, side, details);
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
