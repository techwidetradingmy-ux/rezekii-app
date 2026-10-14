import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { listRankings } from "@/modules/rankings/query.ts";
import { rankings } from "@/modules/rankings/store.ts";

export const dynamic = "force-dynamic";

/** One TikTok best-seller list: ?view=0-3 (creators, products, videos, LIVEs)&slot=0-2 (1, 7, 30 days)&cat=&ctype=0-2&wa=1&em=1&x=1&sort=&pg= */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  // Top products (view 1) needs the product details part.
  const b = await rankings(...(Number(p.get("view")) === 1 ? (["pm"] as const) : []));
  if (!b) return NextResponse.json({ error: "The rankings are being prepared. Please check back after the next daily update." }, { status: 503 });
  const result = listRankings(b, {
    view: Number(p.get("view")) || 0, slot: p.has("slot") ? Number(p.get("slot")) : 2, cat: p.get("cat") || undefined, ctype: Number(p.get("ctype")) || 0,
    wa: p.get("wa") === "1", em: p.get("em") === "1", x: p.get("x") === "1", sort: p.get("sort") ?? undefined, pg: Number(p.get("pg")) || 1,
  });
  return NextResponse.json(result, { headers: { "cache-control": "private, max-age=300" } });
}
