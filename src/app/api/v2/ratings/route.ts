import { NextResponse, type NextRequest } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { ratingsOf, showcaseOf } from "@/modules/picks/mine.ts";
import { linesBetween } from "@/modules/sales/frames.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Flag = { id: string; name: string; img: string | null; rating: number; reviews: number; orders: number; cancel: number; returned: number };
type Result = { linked: boolean; total: number; checked: number; more: boolean; flagged: Flag[]; at: string };
const cache = new Map<string, { at: number; r: Result }>();
const cancelled = (s: string | null) => /REFUND|RETURN|CANCEL|INELIGIBLE|INVALID/i.test(s ?? "");

/**
 * Rating check on real data (owner, 31 Oct 2026): every product in her showcase (first 200) with TikTok's buyer rating; under 4★
 * are flagged, with her own orders for them in the last 30 days. Kept 30 minutes; ?fresh=1 checks again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false, total: 0, checked: 0, more: false, flagged: [], at: new Date().toISOString() } satisfies Result);

  await keepFresh(user.id, ["orders"]);
  const { items, more } = await showcaseOf(token);
  const ratings = await ratingsOf(token, items.map((p) => p.id));
  const lines = await linesBetween(user.id, Date.now() - 30 * 86_400_000, Date.now()).catch(() => []);
  const seen = new Map<string, { orders: Set<string>; bad: Set<string>; back: Set<string> }>();
  for (const l of lines) {
    if (!l.product_id) continue;
    const s = seen.get(l.product_id) ?? seen.set(l.product_id, { orders: new Set(), bad: new Set(), back: new Set() }).get(l.product_id)!;
    s.orders.add(l.order_id);
    if (cancelled(l.status)) s.bad.add(l.order_id);
    if (l.returned_quantity > 0 || l.refunded_quantity > 0) s.back.add(l.order_id);
  }
  const flagged = items
    .filter((p) => (ratings.get(p.id)?.score ?? 5) < 4)
    .map((p) => {
      const s = seen.get(p.id);
      const orders = s?.orders.size ?? 0;
      return { ...p, rating: ratings.get(p.id)!.score, reviews: ratings.get(p.id)!.count, orders, cancel: orders ? Math.round(((s?.bad.size ?? 0) / orders) * 1000) / 10 : 0, returned: s?.back.size ?? 0 };
    })
    .sort((a, b) => a.rating - b.rating);
  const r: Result = { linked: true, total: items.length, checked: ratings.size, more, flagged, at: new Date().toISOString() };
  cache.set(user.id, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
