import { NextResponse } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { showcaseOf } from "@/modules/picks/mine.ts";
import { linesBetween, productImages } from "@/modules/sales/frames.ts";
import { allProducts } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type On = { id: string; name: string; img: string | null; openRate: number | null; silverRate: number | null };
type NotYet = { id: string; name: string; shop: string | null; img: string | null; sold: number };
type Result = { linked: boolean; count: number; more: boolean; on: On[]; notYet: NotYet[]; at: string };
const cache = new Map<string, { at: number; r: Result }>();

/**
 * Her showcase on Rezekii (owner, 31 Oct 2026: real data): which of her showcase products (first 200) are in Rezekii's
 * campaign, and her best sellers of the last 30 days that aren't on Rezekii yet. Kept 30 minutes.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false, count: 0, more: false, on: [], notYet: [], at: new Date().toISOString() } satisfies Result);

  await keepFresh(user.id, ["orders"]);
  const [showcase, catalog, lines] = await Promise.all([
    showcaseOf(token),
    allProducts(),
    linesBetween(user.id, Date.now() - 30 * 86_400_000, Date.now()).catch(() => []),
  ]);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const on = showcase.items
    .filter((p) => byId.has(p.id))
    .map((p) => { const c = byId.get(p.id)!; return { id: p.id, name: c.name, img: c.image ?? p.img, openRate: c.openRate, silverRate: c.silverRate }; });

  const sold = new Map<string, NotYet>();
  for (const l of lines) {
    if (!l.product_id || byId.has(l.product_id) || /REFUND|CANCEL/i.test(l.status ?? "")) continue;
    const s = sold.get(l.product_id) ?? sold.set(l.product_id, { id: l.product_id, name: l.product_name ?? "Product", shop: l.shop_name, img: null, sold: 0 }).get(l.product_id)!;
    s.sold += Math.max(0, l.quantity - l.refunded_quantity - l.returned_quantity);
  }
  const top = [...sold.values()].filter((s) => s.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 30);
  const imgs = await productImages(user.id, top.map((t) => t.id)).catch(() => new Map<string, string | null>());
  const notYet = top.map((t) => ({ ...t, img: imgs.get(t.id) ?? null }));

  const r: Result = { linked: true, count: showcase.items.length, more: showcase.more, on, notYet, at: new Date().toISOString() };
  cache.set(user.id, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
