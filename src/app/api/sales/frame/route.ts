import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getLang } from "@/lib/i18n/server.ts";
import { salesFrame, type Compare } from "@/modules/sales/frames.ts";
import type { Source } from "@/modules/sales/summary.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** The Sales page for one time frame: ?frame=30d|m:2026-09…&source=all|techwide|other&compare=none|prev|year */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const source = (["all", "techwide", "other"].includes(q.get("source") ?? "") ? q.get("source") : "all") as Source;
  const compare = (["none", "prev", "year"].includes(q.get("compare") ?? "") ? q.get("compare") : "none") as Compare;
  const data = await salesFrame(user.id, q.get("frame") ?? "30d", source, compare, Date.now(), await getLang());
  if (!data) return NextResponse.json({ error: "That time frame isn't available." }, { status: 400 });
  return NextResponse.json(data, { headers: { "cache-control": "private, no-store" } });
}
