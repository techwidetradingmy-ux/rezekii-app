import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { firstSteps, guideSeen, markGuide, type GuideSide } from "@/modules/guide/guide.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };
const sideOf = (v: unknown): GuideSide => (v === "seller" ? "seller" : "creator");

/** Getting Started (owner, 4 Nov 2026): ?side= → her first steps, done or not, and whether she closed the card. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const side = sideOf(req.nextUrl.searchParams.get("side"));
  try {
    const [steps, seen] = await Promise.all([firstSteps(user.id, side), guideSeen(user.id)]);
    return NextResponse.json({ steps, closed: !!seen[`list_${side}`] }, NO_STORE);
  } catch (err) {
    console.error("[guide] steps", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load." }, { status: 500 });
  }
}

/** { side, mark: "tour" | "list" }: she finished or skipped the Welcome Tour, or closed Getting Started. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { side?: unknown; mark?: unknown };
  if (b.mark !== "tour" && b.mark !== "list") return NextResponse.json({ error: "Which one?" }, { status: 400 });
  try {
    await markGuide(user.id, sideOf(b.side), b.mark);
  } catch (err) {
    console.error("[guide] mark", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Didn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
