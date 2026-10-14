import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { topCreators } from "@/modules/rankings/boards.ts";

export const dynamic = "force-dynamic";

/** Top creators, last 30 days: ?band=top|10k|1k|100|0&sort=gmv|exact|fol&dir=d|a&gmv=all|exact|range&wa=1&em=1&q=&pg= */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const r = await topCreators({ band: p.get("band") ?? "top", sort: p.get("sort") ?? "gmv", dir: p.get("dir") ?? "d", gmv: p.get("gmv") ?? "all", wa: p.get("wa") === "1", em: p.get("em") === "1", q: (p.get("q") ?? "").slice(0, 60), pg: Number(p.get("pg")) || 1 });
  return NextResponse.json(r, { headers: { "cache-control": "private, max-age=60" } });
}
