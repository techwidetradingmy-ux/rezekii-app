import { NextResponse, type NextRequest } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { kindOf, ratingsOf, showcaseOf } from "@/modules/picks/mine.ts";
import { linesBetween } from "@/modules/sales/frames.ts";
import { lineGmv } from "@/modules/sales/summary.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Her videos that sold a product: TikTok's link to open it, so she can decide in the TikTok app. */
type Video = { id: string; title: string | null; cover: string | null; url: string; orders: number; gmv: number };
type Flag = { id: string; name: string; img: string | null; rating: number; reviews: number; orders: number; cancel: number; returned: number; videos: Video[] };
type Result = { linked: boolean; total: number; checked: number; more: boolean; flagged: Flag[]; at: string };
const cache = new Map<string, { at: number; r: Result }>();
const cancelled = (s: string | null) => /REFUND|RETURN|CANCEL|INELIGIBLE|INVALID/i.test(s ?? "");

/**
 * Showcase health check (owner, 31 Oct 2026): every product in her showcase (up to 1,000) with TikTok's buyer rating. Under 4★
 * is flagged (slightly low under 4, low under 3.5, heavily low under 3), with her own orders for it in the last 30 days and her
 * videos that sold it. TikTok doesn't say which product a video carries, so videos with no sales of it can't be found.
 * Kept 30 minutes; ?fresh=1 checks again.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const hit = cache.get(user.id);
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - hit.at < 30 * 60_000) return NextResponse.json(hit.r);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false, total: 0, checked: 0, more: false, flagged: [], at: new Date().toISOString() } satisfies Result);

  await keepFresh(user.id, ["orders"]);
  const { items, more } = await showcaseOf(token, 50);
  const ratings = await ratingsOf(token, items.map((p) => p.id));
  const lines = await linesBetween(user.id, Date.now() - 30 * 86_400_000, Date.now()).catch(() => []);
  type Seen = { orders: Set<string>; bad: Set<string>; back: Set<string>; videos: Map<string, { orders: Set<string>; gmv: number }> };
  const seen = new Map<string, Seen>();
  for (const l of lines) {
    if (!l.product_id) continue;
    const s = seen.get(l.product_id) ?? seen.set(l.product_id, { orders: new Set(), bad: new Set(), back: new Set(), videos: new Map() }).get(l.product_id)!;
    s.orders.add(l.order_id);
    if (cancelled(l.status)) s.bad.add(l.order_id);
    if (l.returned_quantity > 0 || l.refunded_quantity > 0) s.back.add(l.order_id);
    if (l.content_id && kindOf(l.content_type) === "video") {
      const v = s.videos.get(l.content_id) ?? s.videos.set(l.content_id, { orders: new Set(), gmv: 0 }).get(l.content_id)!;
      v.orders.add(l.order_id);
      v.gmv += lineGmv(l);
    }
  }
  const low = items.filter((p) => (ratings.get(p.id)?.score ?? 5) < 4);
  // Titles, covers and links of her videos, where Rezekii has them saved.
  const vids = [...new Set(low.flatMap((p) => [...(seen.get(p.id)?.videos.keys() ?? [])]))];
  const meta = new Map<string, { title: string | null; cover: string | null; share_url: string | null }>();
  for (let i = 0; i < vids.length; i += 100)
    for (const r of (await (await supabaseRest(`tiktok_videos?video_id=in.(${vids.slice(i, i + 100).join(",")})&select=video_id,title,cover,share_url`)).json()) as { video_id: string; title: string | null; cover: string | null; share_url: string | null }[])
      meta.set(r.video_id, r);
  const handle = user.tiktok_username;
  const flagged: Flag[] = low
    .map((p) => {
      const s = seen.get(p.id);
      const orders = s?.orders.size ?? 0;
      const videos = [...(s?.videos.entries() ?? [])]
        .map(([id, v]) => ({ id, title: meta.get(id)?.title ?? null, cover: meta.get(id)?.cover ?? null, url: meta.get(id)?.share_url ?? `https://www.tiktok.com/${handle ? `@${handle}` : "@"}/video/${id}`, orders: v.orders.size, gmv: Math.round(v.gmv * 100) / 100 }))
        .sort((a, b) => b.orders - a.orders);
      return { ...p, rating: ratings.get(p.id)!.score, reviews: ratings.get(p.id)!.count, orders, cancel: orders ? Math.round(((s?.bad.size ?? 0) / orders) * 1000) / 10 : 0, returned: s?.back.size ?? 0, videos };
    })
    .sort((a, b) => a.rating - b.rating);
  const r: Result = { linked: true, total: items.length, checked: ratings.size, more, flagged, at: new Date().toISOString() };
  cache.set(user.id, { at: Date.now(), r });
  return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
}
