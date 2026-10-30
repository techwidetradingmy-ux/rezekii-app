import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { lookupOf, ratingsOf, salesProfile, showcaseOf } from "@/modules/picks/mine.ts";
import { productsFor } from "@/modules/tap/for-creator.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = {
  id: string; name: string; img: string | null; category: string | null; rating: number | null;
  /** Marketplace: units sold on TikTok Shop (all time) and today. Showcase: her own units, last 7 and 30 days. */
  sold: number; today: number | null; units7: number | null; units30: number | null;
  /** Her own units per day for the last 7 days, oldest first (showcase only). */
  week: number[] | null;
  /** Open-plan rate and Rezekii's rate (×100); the page picks hers by level. */
  openRate: number | null; silverRate: number | null;
};
type Result = { linked: boolean; source: "market" | "showcase"; categories: string[]; rows: Row[]; at: string };
const cache = new Map<string, { at: number; r: Result }>();
const KEEP = 30;

/**
 * Today's Ideas on real data (owner, 31 Oct 2026). Marketplace: Rezekii's campaign products in her own top categories (from her
 * last 30 days of sales) that aren't in her showcase, best-selling first, 4★ and up. Showcase: products in her showcase, ranked
 * by what she sold of them in the last 7 days, with her sales per day. Kept 30 minutes; ?fresh=1 checks again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const source = req.nextUrl.searchParams.get("source") === "showcase" ? "showcase" : "market";
  const key = `${user.id}:${source}`;
  const hit = cache.get(key);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false, source, categories: [], rows: [], at: new Date().toISOString() } satisfies Result);

  const [prof, showcase] = await Promise.all([salesProfile(user.id, token), showcaseOf(token)]);
  let rows: Row[];
  if (source === "showcase") {
    const ranked = showcase.items
      .map((p) => ({ p, s: prof.products.get(p.id) }))
      .sort((a, b) => (b.s?.daily.reduce((x, y) => x + y, 0) ?? 0) - (a.s?.daily.reduce((x, y) => x + y, 0) ?? 0) || (b.s?.units ?? 0) - (a.s?.units ?? 0))
      .slice(0, KEEP);
    const ids = ranked.map((r) => r.p.id);
    const [info, ratings] = await Promise.all([lookupOf(token, ids), ratingsOf(token, ids)]);
    rows = ranked.map(({ p, s }) => {
      const units7 = s?.daily.reduce((x, y) => x + y, 0) ?? 0;
      return {
        id: p.id, name: p.name, img: p.img, category: info.get(p.id)?.category ?? prof.categoryOf.get(p.id) ?? null, rating: ratings.get(p.id)?.score ?? null,
        sold: units7, today: null, units7, units30: s?.units ?? 0, week: s?.daily ?? [0, 0, 0, 0, 0, 0, 0], openRate: info.get(p.id)?.rate ?? null, silverRate: null,
      };
    });
  } else {
    const inShowcase = new Set(showcase.items.map((p) => p.id));
    const mine = new Set([...prof.categories.entries()].filter(([, c]) => c.share >= 0.01).map(([c]) => c));
    const all = (await productsFor(user.id)).filter((p) => !inShowcase.has(p.id) && p.stock !== 0);
    // Her categories first; with no sales yet, every category.
    const pool = (mine.size ? all.filter((p) => p.category && mine.has(p.category)) : all).slice(0, KEEP + 20);
    const ratings = await ratingsOf(token, pool.map((p) => p.id));
    rows = pool
      .filter((p) => (ratings.get(p.id)?.score ?? 5) >= 4)
      .slice(0, KEEP)
      .map((p) => ({
        id: p.id, name: p.name, img: p.image, category: p.category, rating: ratings.get(p.id)?.score ?? null,
        sold: p.sold, today: p.soldToday, units7: null, units30: null, week: null, openRate: p.openRate, silverRate: p.silverRate,
      }));
  }
  const categories = [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))];
  const r: Result = { linked: true, source, categories, rows, at: new Date().toISOString() };
  cache.set(key, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
