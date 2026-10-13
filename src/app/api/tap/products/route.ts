import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { SORTS, searchProducts, type Sort } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";

/** TAP Marketplace search: ?q=&category=&shop=&samples=1&sort=sold|today|rate|price-asc|price-desc&page=1 (24 per page). */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const sort = (p.get("sort") ?? "sold") as Sort;
  const result = await searchProducts({
    q: p.get("q") ?? "",
    category: p.get("category") || undefined,
    shop: p.get("shop") || undefined,
    samples: p.get("samples") === "1",
    sort: sort in SORTS ? sort : "sold",
    page: Number(p.get("page") ?? 1) || 1,
  });
  return NextResponse.json(result, { headers: { "cache-control": "private, max-age=60" } });
}
