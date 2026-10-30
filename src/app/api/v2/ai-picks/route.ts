import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { salesProfile, showcaseOf } from "@/modules/picks/mine.ts";
import { productsFor } from "@/modules/tap/for-creator.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pct = (part: number, all: number) => (all > 0 ? Math.round((part / all) * 100) : 0);

type Pick = {
  id: string; name: string; shop: string | null; category: string | null; image: string | null; priceLo: number | null; openRate: number | null; silverRate: number | null;
  sold: number; samples: number;
  /** Fit with her, out of 100, from the four parts below. Not a forecast. */
  match: number; parts: { category: number; price: number; rate: number; demand: number };
  /** Video or LIVE, from where her own sales in this category come from (her overall split when she has none in it). */
  fit: "video" | "live"; video: number; live: number; fromCategory: boolean;
  /** Place among Rezekii's products in its category, by sold. */
  rank: number; why: string[];
};
type Result = {
  linked: boolean;
  profile: { categories: [string, number][]; video: number; price: string | null; aov: number; orders: number; days: number };
  compared: number; picks: Pick[]; at: string;
};
const cache = new Map<string, { at: number; r: Result }>();

/**
 * AI Picks on real data (owner, 31 Oct 2026): what she sold in the last 30 days (categories, video or LIVE, price range) is
 * matched against Rezekii's campaign products she doesn't have in her showcase yet. The match is a rule score she can read:
 * her category (up to 45), her price range (20), commission (20) and how well it sells (15). Kept 30 minutes; ?fresh=1 again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  const none: Result = { linked: false, profile: { categories: [], video: 0, price: null, aov: 0, orders: 0, days: 30 }, compared: 0, picks: [], at: new Date().toISOString() };
  if (!token) return NextResponse.json(none);

  // Her sales: categories, video or LIVE and prices, and what's already in her showcase.
  const [prof, showcase] = await Promise.all([salesProfile(user.id, token), showcaseOf(token)]);
  const mine = prof.products;
  const cats = prof.categories;
  const share = new Map([...cats.entries()].map(([c, s]) => [c, s.share]));
  const topShare = Math.max(0, ...share.values());
  const { video, live, units, gmv, orders } = prof;

  // Her price range: the middle 80% of the items she sold.
  const lo = units.length >= 5 ? units[Math.floor(units.length * 0.1)] : null;
  const hi = units.length >= 5 ? units[Math.min(units.length - 1, Math.ceil(units.length * 0.9) - 1)] : null;

  // Products she can't add again: already in her showcase.
  const inShowcase = new Set(showcase.items.map((p) => p.id));

  const all = await productsFor(user.id);
  const rankIn = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const p of all) {
    const c = p.category ?? "";
    const n = (seen.get(c) ?? 0) + 1;
    seen.set(c, n);
    rankIn.set(p.id, n);
  }
  const pool = all.filter((p) => !inShowcase.has(p.id) && !mine.has(p.id) && p.stock !== 0 && (p.priceLo ?? 0) > 0);
  const maxRate = Math.max(1, ...pool.map((p) => p.silverRate ?? p.openRate ?? 0));
  const maxSold = Math.max(1, ...pool.map((p) => p.sold));
  const allSplit = video + live;

  const picks = pool
    .map((p): Pick => {
      const c = p.category ?? "";
      const s = share.get(c) ?? 0;
      const price = p.priceLo ?? 0;
      const category = topShare ? Math.round((s / topShare) * 45) : 0;
      const priceFit = lo === null || hi === null ? 10 : price >= lo && price <= hi ? 20 : price >= lo / 2 && price <= hi * 2 ? 10 : 0;
      const rate = Math.round((((p.silverRate ?? p.openRate ?? 0) / maxRate) * 20));
      const demand = Math.round((Math.log10(p.sold + 1) / Math.log10(maxSold + 1)) * 15);
      const cs = cats.get(c);
      const fromCategory = !!cs && cs.video + cs.live > 0;
      const v = fromCategory ? pct(cs!.video, cs!.video + cs!.live) : allSplit ? pct(video, allSplit) : 50;
      const why = [
        s > 0 ? `${c} is ${Math.round(s * 100)}% of your sales` : null,
        priceFit === 20 ? "In your price range" : null,
        rankIn.get(p.id)! <= 3 && p.sold > 0 ? `#${rankIn.get(p.id)} best-seller in ${c} on Rezekii` : null,
        p.samples > 0 ? "Free sample" : null,
      ].filter((x): x is string => !!x);
      return {
        id: p.id, name: p.name, shop: p.shop, category: p.category, image: p.image, priceLo: p.priceLo, openRate: p.openRate, silverRate: p.silverRate,
        sold: p.sold, samples: p.samples, match: Math.max(1, category + priceFit + rate + demand), parts: { category, price: priceFit, rate, demand },
        fit: v >= 50 ? "video" : "live", video: v, live: 100 - v, fromCategory, rank: rankIn.get(p.id) ?? 0, why,
      };
    })
    .sort((a, b) => b.match - a.match || b.sold - a.sold)
    .slice(0, 30);

  const r: Result = {
    linked: true,
    profile: {
      categories: [...share.entries()].filter(([, s]) => s >= 0.01).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, s]) => [c, Math.round(s * 100)]),
      video: allSplit ? pct(video, allSplit) : 0,
      price: lo !== null && hi !== null ? `RM ${Math.round(lo)}–${Math.round(hi)}` : null,
      aov: orders ? Math.round((gmv / orders) * 100) / 100 : 0,
      orders,
      days: 30,
    },
    compared: pool.length,
    picks,
    at: new Date().toISOString(),
  };
  cache.set(user.id, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
