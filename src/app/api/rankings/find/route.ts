import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { findCreators } from "@/modules/rankings/query.ts";
import { rankings } from "@/modules/rankings/store.ts";

export const dynamic = "force-dynamic";

/** Creator Marketplace search: ?q=&f=0101 (10k+ followers, mostly video, mostly LIVE, shares exact GMV)&sort=gmv|fol&pg= */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await rankings();
  if (!b) return NextResponse.json({ error: "The rankings are being prepared." }, { status: 503 });
  const p = req.nextUrl.searchParams;
  const f = (p.get("f") ?? "").split("").map((c) => c === "1");
  return NextResponse.json(findCreators(b, { text: (p.get("q") ?? "").slice(0, 60), f, sort: p.get("sort") ?? "gmv", pg: Number(p.get("pg")) || 1 }), { headers: { "cache-control": "private, max-age=120" } });
}
