import { after, NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { linesBetween, productImages } from "@/modules/sales/frames.ts";
import { syncCreatorOrders } from "@/modules/sales/orders.ts";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { lineEarned, lineGmv, techwideCampaigns, type OrderLine } from "@/modules/sales/summary.ts";

/**
 * The full commission on each order, as TikTok Shop shows it to her (owner, 30 Oct 2026): for a creator with an agency, TikTok
 * records the agency's share separately and her own share can read 0, so the full amount is what she recognises.
 */
const lineCommission = lineEarned;

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RANGES = [["3 days", 3], ["7 days", 7], ["14 days", 14], ["30 days", 30], ["90 days", 90], ["Lifetime", 0]] as const;
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Malaysia time, so a day starts at midnight in KL. */
const MYT = 8 * 3_600_000;
const dayStart = (t: number) => Math.floor((t + MYT) / DAY) * DAY - MYT;
const label = (t: number) => { const d = new Date(t + MYT); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const settled = (s: string | null) => /SETTLED|COMPLETED/i.test(s ?? "") && !/TO.?SETTLE/i.test(s ?? "");
const cancelled = (s: string | null) => /REFUND|RETURN|CANCEL|INELIGIBLE|INVALID/i.test(s ?? "");
const channelOf = (t: string | null) => (/LIVE/i.test(t ?? "") ? 1 : /VIDEO/i.test(t ?? "") ? 0 : 2);

/**
 * The creator's Analytics and Payouts from her real TikTok Shop orders (owner, 30 Oct 2026: real data, same design). Every
 * number is counted from her order lines; nothing is estimated. `extra` = commission on Techwide's TAP orders above what the
 * open plan pays for those products.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const now = Date.now();
  const [lines, techwide] = await Promise.all([linesBetween(user.id, 0, now + DAY), techwideCampaigns()]);

  // The open plan rate of each TAP product she sold, to count what Rezekii added.
  const tapIds = [...new Set(lines.filter((l) => l.campaign_id && techwide.has(l.campaign_id) && l.product_id).map((l) => l.product_id as string))];
  const openRate = new Map<string, number>();
  for (let i = 0; i < tapIds.length; i += 150) {
    const rows = (await (await supabaseRest(`tap_catalog?product_id=in.(${tapIds.slice(i, i + 150).join(",")})&select=product_id,open_rate`)).json()) as { product_id: string; open_rate: number | null }[];
    for (const r of rows) openRate.set(r.product_id, (r.open_rate ?? 0) / 10_000);
  }
  const extraOf = (l: OrderLine) => (l.campaign_id && techwide.has(l.campaign_id) && l.product_id && openRate.has(l.product_id) ? Math.max(0, lineCommission(l) - lineGmv(l) * (openRate.get(l.product_id) ?? 0)) : 0);

  // Her orders are read again from TikTok when the last read is over 30 minutes old (owner, 31 Oct 2026: real time), after this
  // answer, so the next visit shows them; the daily refresh does the same for everyone.
  const lastRead = lines.reduce((m, l) => Math.max(m, Date.parse(l.synced_at)), 0);
  if (now - lastRead > 30 * 60_000) after(async () => { const token = await approvedCreatorToken(user.id); if (token) await syncCreatorOrders(user.id, token, Date.now() + 45_000).catch(() => 0); });
  const first = lines.length ? Math.min(...lines.map((l) => Date.parse(l.created_at))) : now;
  const names = new Map<string, { name: string; shop: string }>();
  for (const l of lines) if (l.product_id && !names.has(l.product_id)) names.set(l.product_id, { name: l.product_name ?? "Product", shop: l.shop_name ?? "" });

  const sum = (from: number, to: number) => {
    const inRange = lines.filter((l) => { const t = Date.parse(l.created_at); return t >= from && t < to; });
    const orders = new Set(inRange.map((l) => l.order_id));
    const cancelledOrders = new Set(inRange.filter((l) => cancelled(l.status)).map((l) => l.order_id));
    const ch = [0, 0, 0];
    const byProduct = new Map<string, { productId: string; commission: number; orders: Set<string> }>();
    let gmv = 0, est = 0, paid = 0;
    for (const l of inRange) {
      const c = lineCommission(l);
      gmv += lineGmv(l);
      est += c;
      if (settled(l.status)) paid += c;
      ch[channelOf(l.content_type)] += c;
      if (l.product_id) {
        const b = byProduct.get(l.product_id) ?? { productId: l.product_id, commission: 0, orders: new Set<string>() };
        b.commission += c;
        b.orders.add(l.order_id);
        byProduct.set(l.product_id, b);
      }
    }
    const ranked = [...byProduct.values()].sort((a, b) => b.commission - a.commission);
    const top = ranked.slice(0, 5);
    return {
      gmv: r2(gmv), orders: orders.size, est: r2(est), paid: r2(paid),
      cancel: orders.size ? r2((cancelledOrders.size / orders.size) * 100) : 0,
      channel: (est > 0 ? ch.map((v) => Math.round((v / est) * 100)) : [0, 0, 0]) as [number, number, number],
      byProduct: top.map((b) => ({ productId: b.productId, commission: r2(b.commission), orders: b.orders.size })),
      other: r2(ranked.slice(5).reduce((a, b) => a + b.commission, 0)),
    };
  };

  // Her own dates from the calendar (?from=YYYY-MM-DD&to=YYYY-MM-DD, Malaysia days): the same numbers for exactly those days,
  // compared with the same number of days before.
  const q = req.nextUrl.searchParams;
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T00:00:00Z`) - MYT : null);
  const cFrom = day(q.get("from")), cTo = day(q.get("to"));
  if (cFrom !== null && cTo !== null && cTo >= cFrom) {
    const n = Math.round((cTo - cFrom) / DAY) + 1;
    const end = Math.min(cTo + DAY, now + 1);
    const cur = sum(cFrom, end);
    const prev = sum(cFrom - n * DAY, cFrom);
    const change = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
    const lv = cur.channel[1];
    const note = !cur.orders ? "No orders in these days." : `${lv >= 30 ? `LIVE brought ${lv}% of your commission. ` : ""}Cancels and returns: ${cur.cancel}% of orders.`;
    const chart = n <= 31
      ? { unit: "day" as const, points: Array.from({ length: n }, (_, i) => { const d = cFrom + i * DAY; return [label(d), sum(d, d + DAY).est] as [string, number]; }) }
      : { unit: "week" as const, points: Array.from({ length: Math.ceil(n / 7) }, (_, i) => { const d = cFrom + i * 7 * DAY; return [label(d), sum(d, Math.min(d + 7 * DAY, end)).est] as [string, number]; }) };
    const ids = cur.byProduct.map((b) => b.productId);
    const imgs = await productImages(user.id, ids).catch(() => new Map<string, string | null>());
    const products = Object.fromEntries(ids.map((id) => [id, { ...(names.get(id) ?? { name: "Product", shop: "" }), img: imgs.get(id) ?? null }]));
    return NextResponse.json({ range: { ...cur, gmvChange: change(cur.gmv, prev.gmv), ordersChange: change(cur.orders, prev.orders), note }, chart, products }, { headers: { "cache-control": "private, no-store" } });
  }

  const ranges: Record<string, unknown> = {};
  const charts: Record<string, { unit: "day" | "week" | "month"; points: [string, number][] }> = {};
  const today = dayStart(now);
  for (const [key, n] of RANGES) {
    const from = n ? today - (n - 1) * DAY : dayStart(first);
    const cur = sum(from, now + 1);
    const prev = n ? sum(from - n * DAY, from) : null;
    const change = (a: number, b: number | undefined) => (prev && b ? Math.round(((a - b) / b) * 100) : null);
    // The note says only what the numbers show.
    const live = cur.channel[1];
    const note = !cur.orders ? "No orders in this period yet." : `${live >= 30 ? `LIVE brought ${live}% of your commission. ` : ""}Cancels and returns: ${cur.cancel}% of orders.`;
    ranges[key] = { ...cur, gmvChange: change(cur.gmv, prev?.gmv), ordersChange: change(cur.orders, prev?.orders), note };
    if (n && n <= 30) charts[key] = { unit: "day", points: Array.from({ length: n }, (_, i) => { const d = from + i * DAY; return [label(d), sum(d, d + DAY).est] as [string, number]; }) };
    else if (n) charts[key] = { unit: "week", points: Array.from({ length: Math.ceil(n / 7) }, (_, i) => { const d = from + i * 7 * DAY; return [label(d), sum(d, Math.min(d + 7 * DAY, now + 1)).est] as [string, number]; }) };
    else {
      const pts: [string, number][] = [];
      const s = new Date(first + MYT);
      for (let y = s.getUTCFullYear(), m = s.getUTCMonth(); Date.UTC(y, m, 1) - MYT <= now; m === 11 ? (y++, m = 0) : m++) pts.push([MONTHS[m], sum(Date.UTC(y, m, 1) - MYT, Date.UTC(y, m + 1, 1) - MYT).est]);
      charts[key] = { unit: "month", points: pts.slice(-12) };
    }
  }

  // Payouts per month, newest first, with every day of each month.
  const months: unknown[] = [];
  const end = new Date(now + MYT);
  for (let i = 0; i < 6; i++) {
    const y = end.getUTCFullYear(), m = end.getUTCMonth() - i;
    const from = Date.UTC(y, m, 1) - MYT, to = Date.UTC(y, m + 1, 1) - MYT;
    if (to < first) break;
    const inMonth = lines.filter((l) => { const t = Date.parse(l.created_at); return t >= from && t < to; });
    let est = 0, paid = 0, pending = 0, clawed = 0, extra = 0;
    const days = Array.from({ length: Math.round((to - from) / DAY) }, (_, d) => ({ day: d + 1, est: 0, extra: 0, clawed: 0, state: from + d * DAY > now ? "future" : "paid" }));
    for (const l of inMonth) {
      const d = days[Math.floor((Date.parse(l.created_at) - from) / DAY)];
      const c = lineCommission(l);
      const x = extraOf(l);
      const lost = Number(l.commission_earned_estimated ?? l.commission_estimated ?? 0);
      if (cancelled(l.status)) { clawed += lost; if (d) d.clawed += lost; continue; }
      est += c; extra += x;
      if (settled(l.status)) paid += c; else { pending += c; if (d) d.state = "pending"; }
      if (d) { d.est += c; d.extra += x; }
    }
    const when = new Date(from + MYT);
    months.push({
      month: `${FULL[when.getUTCMonth()]} ${when.getUTCFullYear()}`, est: r2(est), paid: r2(paid), pending: r2(pending), clawed: r2(clawed), extra: r2(extra),
      status: pending > 0 ? "Settling" : "Paid", year: when.getUTCFullYear(), monthIndex: when.getUTCMonth(),
      days: days.map((d) => ({ ...d, est: r2(d.est), extra: r2(d.extra), clawed: r2(d.clawed) })),
    });
  }

  // Photos for the top earners shown on the page (the product's TikTok Shop image).
  const shown = [...new Set(Object.values(ranges).flatMap((r) => (r as { byProduct: { productId: string }[] }).byProduct.map((b) => b.productId)))];
  const imgs = await productImages(user.id, shown).catch(() => new Map<string, string | null>());
  const products = Object.fromEntries([...names].map(([id, x]) => [id, { ...x, img: imgs.get(id) ?? null }]));
  const syncedAt = lines.reduce<string | null>((m, l) => (!m || l.synced_at > m ? l.synced_at : m), null);
  return NextResponse.json({ ranges, charts, months, products, lines: lines.length, first: lines.length ? new Date(first).toISOString() : null, syncedAt }, { headers: { "cache-control": "private, no-store" } });
}
