import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { topSellers } from "@/modules/rankings/boards.ts";

export const dynamic = "force-dynamic";

/** Top sellers (shop accounts): ?period=1D|7D|30D&kind=all|official|channel&sort=gmv|fol&dir=d|a */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const r = await topSellers({ period: p.get("period") ?? "30D", kind: p.get("kind") ?? "all", sort: p.get("sort") ?? "gmv", dir: p.get("dir") ?? "d" });
  return NextResponse.json(r, { headers: { "cache-control": "private, max-age=60" } });
}
