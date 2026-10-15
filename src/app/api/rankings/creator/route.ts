import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { levelMap } from "@/modules/rankings/levels-map.ts";
import { creatorPanel } from "@/modules/rankings/query.ts";
import { creatorDetail, rankings } from "@/modules/rankings/store.ts";
import { isWarmCall } from "@/modules/refresh/warm.ts";

export const dynamic = "force-dynamic";

/** A creator's TikTok Creator Marketplace profile, best-selling video and TikTok Shop level, for the Rankings panel: ?u=username */
export async function GET(req: NextRequest) {
  if (await isWarmCall(req)) return NextResponse.json({ warmed: (await levelMap()).size });
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await rankings();
  const u = (req.nextUrl.searchParams.get("u") ?? "").slice(0, 40);
  if (!b || !u) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const lv = (await levelMap().catch(() => new Map<string, number>())).get(u.toLowerCase()) ?? null;
  const panel = creatorPanel(b, u);
  const det = panel.det ?? (await creatorDetail(u, panel.rate30).catch(() => null));
  return NextResponse.json({ ...panel, det, lv }, { headers: { "cache-control": "private, max-age=300" } });
}
