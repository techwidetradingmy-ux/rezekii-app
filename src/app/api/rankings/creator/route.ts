import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { creatorPanel } from "@/modules/rankings/query.ts";
import { rankings } from "@/modules/rankings/store.ts";

export const dynamic = "force-dynamic";

/** A creator's TikTok Creator Marketplace profile and best-selling video, for the Rankings panel: ?u=username */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await rankings();
  const u = (req.nextUrl.searchParams.get("u") ?? "").slice(0, 40);
  if (!b || !u) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(creatorPanel(b, u), { headers: { "cache-control": "private, max-age=300" } });
}
