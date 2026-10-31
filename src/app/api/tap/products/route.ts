import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { browse } from "@/modules/tap/catalog.ts";
import { productsFor } from "@/modules/tap/for-creator.ts";

export const dynamic = "force-dynamic";

/** TAP Marketplace list: ?q=&cat=&shop=&only=1&sort=sold-d|com-d|com-a|price-a|price-d|smp-d|sold-a&page=1 (24 per page), with filter counts. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  // Free samples as this creator can request them (their own TikTok check).
  const all = await productsFor(user.id);
  // When the catalog was last read from TikTok (owner, 31 Oct 2026: show how new the data is).
  const asOf = all.reduce<string | null>((m, x) => (x.asOf && (!m || x.asOf > m) ? x.asOf : m), null);
  const result = browse(all, {
    q: (p.get("q") ?? "").slice(0, 80),
    cat: p.get("cat") || undefined,
    shop: p.get("shop") || undefined,
    only: p.get("only") === "1",
    sort: p.get("sort") ?? undefined,
    page: Number(p.get("page") ?? 1) || 1,
  });
  return NextResponse.json({ ...result, asOf }, { headers: { "cache-control": "private, no-store" } });
}
