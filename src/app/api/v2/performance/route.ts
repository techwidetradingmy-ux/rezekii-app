import { after, NextResponse, type NextRequest } from "next/server";
import { learnLiveTimes, liveTimes } from "@/modules/sales/live-times.ts";
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

/** Orders, and items sold and cancelled (owner, 1 Nov 2026: cancel rates are by items). */
type Count = { orders: Set<string>; items: number; badItems: number; gmv: number; commission: number };
type Group = Count & { first: string; byProduct: Map<string, Count> };
const counts = (): Count => ({ orders: new Set(), items: 0, badItems: 0, gmv: 0, commission: 0 });
const empty = (t: string): Group => ({ ...counts(), first: t, byProduct: new Map() });
function tally(c: Count, l: OrderLine) {
  c.orders.add(l.order_id);
  c.items += l.quantity;
  if (cancelled(l.status)) c.badItems += l.quantity;
  c.gmv += lineGmv(l);
  c.commission += lineEarned(l);
}
function add(g: Group, l: OrderLine) {
  tally(g, l);
  if (l.created_at < g.first) g.first = l.created_at;
  if (!l.product_id) return;
  const p = g.byProduct.get(l.product_id) ?? counts();
  tally(p, l);
  g.byProduct.set(l.product_id, p);
}
/** Cancel rate by items, with the items behind it. */
const cancelOf = (c: Count) => ({ cancel: pct(c.badItems, c.items), items: c.items, cancelItems: c.badItems });

/**
 * Performance on real data (owner, 31 Oct 2026): what each video, LIVE and product earned, from her own TikTok Shop orders.
 * Any dates (owner, 1 Nov 2026): ?from=YYYY-MM-DD&to=YYYY-MM-DD in Malaysia days, else the last 30 days. Video titles and views
 * come from her TikTok account when it's connected; the same number of days before is each product's trend.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const read = await keepFresh(user.id);
  const now = Date.now();
  const q = req.nextUrl.searchParams;
  const dayAt = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T00:00:00Z`) - MYT : null);
  const qFrom = dayAt(q.get("from")), qTo = dayAt(q.get("to"));
  const custom = qFrom !== null && qTo !== null && qTo >= qFrom;
  const from = custom ? qFrom : now - 30 * DAY;
  const to = custom ? Math.min(qTo + DAY, now + 1) : now;
  const span = to - from;
  const [lines, before] = await Promise.all([linesBetween(user.id, from, to), linesBetween(user.id, from - span, from)]);

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
  // Cancellations and returns for Risk Check: orders, items, cancelled items, orders with items sent back, and the commission lost.
  const all = new Set(lines.map((l) => l.order_id));
  const bad = new Set(lines.filter((l) => cancelled(l.status)).map((l) => l.order_id));
  const items = lines.reduce((s, l) => s + l.quantity, 0);
  const badItems = lines.filter((l) => cancelled(l.status)).reduce((s, l) => s + l.quantity, 0);
  const back = new Set(lines.filter((l) => l.returned_quantity > 0 || l.refunded_quantity > 0).map((l) => l.order_id));
  const lost = lines.filter((l) => cancelled(l.status)).reduce((s, l) => s + Number(l.commission_earned_estimated ?? l.commission_estimated ?? 0), 0);
  const prevOrders = new Map<string, Set<string>>();
  for (const l of before) if (l.product_id) (prevOrders.get(l.product_id) ?? prevOrders.set(l.product_id, new Set()).get(l.product_id)!).add(l.order_id);

  // Her video titles, dates and views, where the daily video job has them.
  const vids = [...videos.keys()];
  const meta = new Map<string, { title: string | null; created_at: string; views: number | null }>();
  for (let i = 0; i < vids.length; i += 100) {
    const rows = (await (await supabaseRest(`tiktok_videos?video_id=in.(${vids.slice(i, i + 100).join(",")})&select=video_id,title,created_at,views`)).json()) as { video_id: string; title: string | null; created_at: string; views: number | null }[];
    for (const r of rows) meta.set(r.video_id, r);
  }
  // Each video's cover through Rezekii (TikTok's own stops working within a day) and its TikTok link (owner, 2 Nov 2026).
  const handle = user.tiktok_username;
  // Each LIVE's start and end, once TikTok has sent them (owner, 3 Nov 2026: LIVE length and sales per hour); the ones not known
  // yet are asked for after the answer, newest first.
  const liveIds = [...lives.entries()].sort((a, b) => (a[1].first < b[1].first ? 1 : -1)).map(([id]) => id);
  const [imgs, times] = await Promise.all([
    productImages(user.id, [...products.keys()]).catch(() => new Map<string, string | null>()),
    liveTimes(user.id, liveIds).catch(() => ({} as Awaited<ReturnType<typeof liveTimes>>)),
  ]);
  if (liveIds.some((id) => !times[id])) after(() => learnLiveTimes(user.id, liveIds).catch((err) => console.error("[live times]", err instanceof Error ? err.message : err)));
  const topProduct = (g: Group) => [...g.byProduct.entries()].sort((a, b) => b[1].gmv - a[1].gmv)[0]?.[0] ?? "";

  return NextResponse.json({
    videos: [...videos.entries()].map(([id, g]) => {
      const m = meta.get(id);
      return { id, title: m?.title?.trim() || "Video", date: day(m?.created_at ?? g.first), views: m?.views ?? null, orders: g.orders.size, gmv: r2(g.gmv), commission: r2(g.commission), ...cancelOf(g), productId: topProduct(g), refunds: g.badItems, cover: `/api/img/v/${id}`, url: `https://www.tiktok.com/${handle ? `@${handle}/` : ""}video/${id}` };
    }),
    lives: [...lives.entries()].map(([id, g]) => ({
      id, ...when(g.first), orders: g.orders.size, gmv: r2(g.gmv), commission: r2(g.commission), ...cancelOf(g), ...(times[id] ?? {}),
      products: [...g.byProduct.entries()].sort((a, b) => b[1].commission - a[1].commission).map(([pid, p]) => [pid, r2(p.commission), p.orders.size, pct(p.badItems, p.items), r2(p.gmv), p.items, p.badItems] as const),
    })),
    products: [...products.entries()].map(([id, g]) => ({ productId: id, commission: r2(g.commission), orders: g.orders.size, ...cancelOf(g), prevOrders: prevOrders.get(id)?.size ?? 0, split: { video: r2(g.split.video), live: r2(g.split.live), other: r2(g.split.other) } })),
    names: Object.fromEntries([...names.entries()].map(([id, name]) => [id, { name, img: imgs.get(id) ?? null }])),
    totals: { orders: all.size, cancelled: bad.size, returns: back.size, items, cancelItems: badItems, cancelRate: pct(badItems, items), clawback: r2(lost) },
    asOf: new Date(now).toISOString(),
    from: new Date(from).toISOString(), to: new Date(to).toISOString(),
    // The older of her orders' and videos' last read: everything on the page is at least this new.
    updated: [read.orders, read.videos].filter((t): t is string => !!t).sort()[0] ?? null,
  }, { headers: { "cache-control": "private, no-store" } });
}
