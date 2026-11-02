import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { browse } from "@/modules/tap/catalog.ts";
import { productsFor } from "@/modules/tap/for-creator.ts";
import { knownRatings } from "@/modules/tap/product-facts.ts";

export const dynamic = "force-dynamic";

/** TAP Marketplace list: ?q=&cat=&shop=&only=1&sort=sold-d|com-d|com-a|price-a|price-d|smp-d|sold-a&page=1 (24 per page), with filter counts. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = req.nextUrl.searchParams;
  // Free samples as this creator can request them (their own TikTok check); products TikTok refused for her are left out.
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
  // Each card's rating where Rezekii already knows it (owner, 2 Nov 2026): one read for the page, never TikTok per card.
  const ratings = await knownRatings(result.items.map((x) => x.id)).catch(() => new Map<string, number>());
  const items = result.items.map((x) => ({ ...x, rating: ratings.get(x.id) ?? null }));
  return NextResponse.json({ ...result, items, asOf }, { headers: { "cache-control": "private, no-store" } });
}
