import { NextResponse } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { linesBetween, productImages } from "@/modules/sales/frames.ts";
import { lineEarned, lineGmv, type OrderLine } from "@/modules/sales/summary.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (part: number, all: number) => (all ? Math.round((part / all) * 1000) / 10 : 0);
const cancelled = (s: string | null) => /REFUND|RETURN|CANCEL|INELIGIBLE|INVALID/i.test(s ?? "");
const kind = (t: string | null) => (/LIVE/i.test(t ?? "") ? "live" : /VIDEO/i.test(t ?? "") ? "video" : "other");
const myt = (t: string) => new Date(Date.parse(t) + MYT);
const day = (t: string) => { const d = myt(t); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const when = (t: string) => { const d = myt(t); const h = d.getUTCHours(); return { date: `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, time: `${h % 12 || 12}${d.getUTCMinutes() ? `:${String(d.getUTCMinutes()).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}` }; };

type Group = { orders: Set<string>; bad: Set<string>; gmv: number; commission: number; first: string; byProduct: Map<string, { commission: number; orders: Set<string>; bad: Set<string>; gmv: number }> };
const empty = (t: string): Group => ({ orders: new Set(), bad: new Set(), gmv: 0, commission: 0, first: t, byProduct: new Map() });
function add(g: Group, l: OrderLine) {
  g.orders.add(l.order_id);
  if (cancelled(l.status)) g.bad.add(l.order_id);
  g.gmv += lineGmv(l);
  g.commission += lineEarned(l);
  if (l.created_at < g.first) g.first = l.created_at;
  if (!l.product_id) return;
  const p = g.byProduct.get(l.product_id) ?? { commission: 0, orders: new Set<string>(), bad: new Set<string>(), gmv: 0 };
  p.commission += lineEarned(l);
  p.gmv += lineGmv(l);
  p.orders.add(l.order_id);
  if (cancelled(l.status)) p.bad.add(l.order_id);
  g.byProduct.set(l.product_id, p);
}

/**
 * Performance on real data (owner, 31 Oct 2026): what each video, LIVE and product earned in the last 30 days, from her own
 * TikTok Shop orders. Video titles and views come from her TikTok account when it's connected; orders before that are the
 * previous 30 days, for each product's trend.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const read = await keepFresh(user.id);
  const now = Date.now();
  const [lines, before] = await Promise.all([linesBetween(user.id, now - 30 * DAY, now), linesBetween(user.id, now - 60 * DAY, now - 30 * DAY)]);

  const videos = new Map<string, Group>();
  const lives = new Map<string, Group>();
  const products = new Map<string, Group & { split: { video: number; live: number; other: number } }>();
  const names = new Map<string, string>();
  for (const l of lines) {
    const k = kind(l.content_type);
    if (k === "video" && l.content_id) add(videos.get(l.content_id) ?? videos.set(l.content_id, empty(l.created_at)).get(l.content_id)!, l);
    if (k === "live" && l.content_id) add(lives.get(l.content_id) ?? lives.set(l.content_id, empty(l.created_at)).get(l.content_id)!, l);
    if (l.product_id) {
      names.set(l.product_id, l.product_name ?? "Product");
      const p = products.get(l.product_id) ?? products.set(l.product_id, { ...empty(l.created_at), split: { video: 0, live: 0, other: 0 } }).get(l.product_id)!;
      add(p, l);
      p.split[k] += lineEarned(l);
    }
  }
  // Cancellations and returns for Risk Check: orders, cancelled orders, orders with items sent back, and the commission lost.
  const all = new Set(lines.map((l) => l.order_id));
  const bad = new Set(lines.filter((l) => cancelled(l.status)).map((l) => l.order_id));
  const back = new Set(lines.filter((l) => l.returned_quantity > 0 || l.refunded_quantity > 0).map((l) => l.order_id));
  const lost = lines.filter((l) => cancelled(l.status)).reduce((s, l) => s + Number(l.commission_earned_estimated ?? l.commission_estimated ?? 0), 0);
  const prevOrders = new Map<string, Set<string>>();
  for (const l of before) if (l.product_id) (prevOrders.get(l.product_id) ?? prevOrders.set(l.product_id, new Set()).get(l.product_id)!).add(l.order_id);

  // Her video titles, dates and views, where the daily video job has them.
  const vids = [...videos.keys()];
  const meta = new Map<string, { title: string | null; created_at: string; views: number | null; cover: string | null }>();
  for (let i = 0; i < vids.length; i += 100) {
    const rows = (await (await supabaseRest(`tiktok_videos?video_id=in.(${vids.slice(i, i + 100).join(",")})&select=video_id,title,created_at,views,cover`)).json()) as { video_id: string; title: string | null; created_at: string; views: number | null; cover: string | null }[];
    for (const r of rows) meta.set(r.video_id, r);
  }
  const imgs = await productImages(user.id, [...products.keys()]).catch(() => new Map<string, string | null>());
  const topProduct = (g: Group) => [...g.byProduct.entries()].sort((a, b) => b[1].gmv - a[1].gmv)[0]?.[0] ?? "";

  return NextResponse.json({
    videos: [...videos.entries()].map(([id, g]) => {
      const m = meta.get(id);
      return { id, title: m?.title?.trim() || "Video", date: day(m?.created_at ?? g.first), views: m?.views ?? null, orders: g.orders.size, gmv: r2(g.gmv), commission: r2(g.commission), cancel: pct(g.bad.size, g.orders.size), productId: topProduct(g), refunds: g.bad.size, cover: m?.cover ?? null };
    }),
    lives: [...lives.entries()].map(([id, g]) => ({
      id, ...when(g.first), orders: g.orders.size, gmv: r2(g.gmv), commission: r2(g.commission), cancel: pct(g.bad.size, g.orders.size),
      products: [...g.byProduct.entries()].sort((a, b) => b[1].commission - a[1].commission).map(([pid, p]) => [pid, r2(p.commission), p.orders.size, pct(p.bad.size, p.orders.size), r2(p.gmv)] as const),
    })),
    products: [...products.entries()].map(([id, g]) => ({ productId: id, commission: r2(g.commission), orders: g.orders.size, cancel: pct(g.bad.size, g.orders.size), prevOrders: prevOrders.get(id)?.size ?? 0, split: { video: r2(g.split.video), live: r2(g.split.live), other: r2(g.split.other) } })),
    names: Object.fromEntries([...names.entries()].map(([id, name]) => [id, { name, img: imgs.get(id) ?? null }])),
    totals: { orders: all.size, cancelled: bad.size, returns: back.size, cancelRate: pct(bad.size, all.size), clawback: r2(lost) },
    asOf: new Date(now).toISOString(),
    // The older of her orders' and videos' last read: everything on the page is at least this new.
    updated: [read.orders, read.videos].filter((t): t is string => !!t).sort()[0] ?? null,
  }, { headers: { "cache-control": "private, no-store" } });
}
