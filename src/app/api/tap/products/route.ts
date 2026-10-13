import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { allProducts, browse } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";

/** TAP Marketplace list: ?q=&cat=&shop=&only=1&sort=sold-d|com-d|com-a|price-a|price-d|smp-d|sold-a&page=1 (24 per page), with filter counts. */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const result = browse(await allProducts(), {
    q: (p.get("q") ?? "").slice(0, 80),
    cat: p.get("cat") || undefined,
    shop: p.get("shop") || undefined,
    only: p.get("only") === "1",
    sort: p.get("sort") ?? undefined,
    page: Number(p.get("page") ?? 1) || 1,
  });
  return NextResponse.json(result, { headers: { "cache-control": "private, max-age=60" } });
}
