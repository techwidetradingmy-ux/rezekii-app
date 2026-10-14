import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { lineCommission, lineEarned, lineGmv, linePartner, techwideCampaigns, type OrderLine, type Source } from "./summary.ts";

/** Sales time frames (owner's list), plus any calendar month as "m:YYYY-MM". */
export const FRAME_KEYS = ["yesterday", "7d", "14d", "30d", "60d", "90d", "month", "lastmonth", "1y", "all"] as const;
export type Compare = "none" | "prev" | "year";
export type Range = { key: string; from: number; to: number; unit: "hour" | "day" | "month"; buckets: number; label: string; dates: string };

const DAY = 86400_000;
const MYT = 8 * 3600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Midnight in Malaysia (as a UTC time) of the day containing `t`. */
const dayStart = (t: number) => Math.floor((t + MYT) / DAY) * DAY - MYT;
/** Midnight in Malaysia of the first day of the month `add` months after the month containing `t`. */
const monthStart = (t: number, add = 0) => { const d = new Date(t + MYT); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + add, 1) - MYT; };
const ymd = (t: number) => { const d = new Date(t + MYT); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
const dayLabel = (t: number) => { const x = ymd(t); return `${x.d} ${MONTHS[x.m]}`; };
const monthLabel = (t: number) => { const x = ymd(t); return `${MONTHS[x.m]} ${x.y}`; };
const monthsBetween = (a: number, b: number) => { const x = ymd(a), y = ymd(b); return (y.y - x.y) * 12 + (y.m - x.m); };

/** The date range, chart unit and words for a time frame, in Malaysia time. `first`: the creator's first order (for all time). */
export function frameRange(key: string, now: number, first: number | null): Range | null {
  const today = dayStart(now), end = today + DAY;
  const days = (n: number, label: string): Range => ({ key, from: today - (n - 1) * DAY, to: end, unit: "day", buckets: n, label, dates: `${dayLabel(today - (n - 1) * DAY)} – ${dayLabel(today)}` });
  switch (key) {
    case "yesterday": return { key, from: today - DAY, to: today, unit: "hour", buckets: 24, label: "Yesterday", dates: dayLabel(today - DAY) };
    case "7d": return days(7, "7 days");
    case "14d": return days(14, "14 days");
    case "30d": return days(30, "30 days");
    case "60d": return days(60, "60 days");
    case "90d": return days(90, "90 days");
    case "month": { const from = monthStart(now); return { key, from, to: end, unit: "day", buckets: Math.round((end - from) / DAY), label: "This month", dates: `${dayLabel(from)} – ${dayLabel(today)}` }; }
    case "lastmonth": { const from = monthStart(now, -1), to = monthStart(now); return { key, from, to, unit: "day", buckets: Math.round((to - from) / DAY), label: "Last month", dates: FULL[ymd(from).m] }; }
    case "1y": { const from = monthStart(now, -11); return { key, from, to: end, unit: "month", buckets: 12, label: "1 year", dates: `${monthLabel(from)} – ${monthLabel(today)}` }; }
    case "all": { const from = monthStart(first ?? now, 0); return { key, from, to: end, unit: "month", buckets: monthsBetween(from, today) + 1, label: "All time", dates: first ? `Since ${dayLabel(first)} ${ymd(first).y}` : "No orders yet" }; }
  }
  // A custom range from the calendar: c:YYYY-MM-DD:YYYY-MM-DD (both days included).
  const c = /^c:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (c) {
    const a = Date.parse(`${c[1]}T00:00:00Z`) - MYT, b = Date.parse(`${c[2]}T00:00:00Z`) - MYT;
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    const from = Math.min(a, b), to = Math.min(Math.max(a, b) + DAY, end);
    if (from >= to) return null;
    const n = Math.round((to - from) / DAY);
    // Long ranges are charted per month, like 1 year.
    if (n > 120) return { key, from: monthStart(from), to, unit: "month", buckets: monthsBetween(from, to - DAY) + 1, label: "Custom dates", dates: `${dayLabel(from)} ${ymd(from).y} – ${dayLabel(to - DAY)} ${ymd(to - DAY).y}` };
    return { key, from, to, unit: "day", buckets: n, label: "Custom dates", dates: n === 1 ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to - DAY)}` };
  }
  const m = /^m:(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const from = Date.UTC(Number(m[1]), Number(m[2]) - 1, 1) - MYT;
  if (from > now) return null;
  const to = Math.min(monthStart(from, 1), end);
  return { key, from, to, unit: "day", buckets: Math.round((to - from) / DAY), label: `${FULL[Number(m[2]) - 1]} ${m[1]}`, dates: "Whole month" };
}

/** The range a time frame is compared with: the same length just before, or the same dates a year earlier. */
export function compareRange(r: Range, how: Compare): Range | null {
  if (how === "none" || (how === "prev" && r.key === "all")) return null;
  if (how === "year") {
    const back = (t: number) => { const d = new Date(t + MYT); return Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()) - MYT; };
    return { ...r, from: back(r.from), to: back(r.to), label: "Same time last year", dates: r.unit === "month" ? `${monthLabel(back(r.from))} – ${monthLabel(back(r.to - DAY))}` : `${dayLabel(back(r.from))} – ${dayLabel(back(r.to - 1))}` };
  }
  if ((r.unit === "month" && !r.key.startsWith("c:")) || r.key === "lastmonth" || r.key.startsWith("m:")) {
    const months = r.unit === "month" ? r.buckets : 1;
    const from = monthStart(r.from, -months), to = r.from;
    return { ...r, from, to, buckets: r.unit === "month" ? months : Math.round((to - from) / DAY), label: "The period before", dates: r.unit === "month" ? `${monthLabel(from)} – ${monthLabel(to - DAY)}` : FULL[ymd(from).m] };
  }
  const len = r.to - r.from;
  return { ...r, from: r.from - len, to: r.from, label: "The period before", dates: r.unit === "hour" ? dayLabel(r.from - len) : `${dayLabel(r.from - len)} – ${dayLabel(r.from - 1)}` };
}

export type StatusKey = "settled" | "toSettle" | "awaiting" | "refunded" | "ineligible";
export const statusOf = (s: string | null): StatusKey =>
  /REFUND|RETURN/i.test(s ?? "") ? "refunded" : /INELIGIBLE|INVALID|CANCEL/i.test(s ?? "") ? "ineligible" : /TO.?SETTLE/i.test(s ?? "") ? "toSettle" : /SETTLED|COMPLETED/i.test(s ?? "") ? "settled" : "awaiting";

/** Orders, sales and commission per status. Refunded and ineligible orders earn nothing: their commission is what was lost. */
export type StatusRow = { key: StatusKey; orders: number; gmv: number; commission: number; earned: number };
export type FrameStats = {
  gmv: number; orders: number; items: number; refunded: number;
  commission: number; earned: number; partnerShare: number;
  buckets: number[];
  status: StatusRow[];
  products: { productId: string; name: string; shop: string; gmv: number; orders: number; commission: number }[];
  content: { id: string; type: string; gmv: number; orders: number }[];
  techwideGmv: number; otherGmv: number;
};

const round = (v: number) => Math.round(v * 100) / 100;
const kept = (l: OrderLine) => Number(l.commission_actual ?? l.commission_estimated ?? 0);
const earnedRaw = (l: OrderLine) => Number(l.commission_earned_actual ?? l.commission_earned_estimated ?? l.commission_actual ?? l.commission_estimated ?? 0);

/** Totals for one range of the creator's order lines (`source`: all shops, Techwide's TAP campaigns, or the rest). */
export function frameStats(lines: OrderLine[], r: Range, techwide: Set<string>, source: Source = "all"): FrameStats {
  const pick = (l: OrderLine) => source === "all" || (source === "techwide") === (!!l.campaign_id && techwide.has(l.campaign_id));
  const inRange = lines.filter((l) => { const t = Date.parse(l.created_at); return t >= r.from && t < r.to && pick(l); });
  const buckets = new Array(r.buckets).fill(0);
  const at = (t: number) => (r.unit === "hour" ? Math.floor((t - r.from) / 3600_000) : r.unit === "day" ? Math.floor((t - r.from) / DAY) : monthsBetween(r.from, t));
  const keys: StatusKey[] = ["settled", "toSettle", "awaiting", "refunded", "ineligible"];
  const status = new Map(keys.map((k) => [k, { key: k, orders: new Set<string>(), gmv: 0, commission: 0, earned: 0 }]));
  const products = new Map<string, FrameStats["products"][number]>();
  const content = new Map<string, FrameStats["content"][number]>();
  let techwideGmv = 0;
  for (const l of inRange) {
    const g = lineGmv(l);
    const i = at(Date.parse(l.created_at));
    if (i >= 0 && i < buckets.length) buckets[i] += g;
    if (l.campaign_id && techwide.has(l.campaign_id)) techwideGmv += g;
    const st = status.get(statusOf(l.status))!;
    st.orders.add(l.order_id);
    st.gmv += Number(l.price) * l.quantity;
    const lost = st.key === "refunded" || st.key === "ineligible";
    st.commission += lost ? Number(l.commission_estimated ?? 0) || earnedRaw(l) : kept(l);
    st.earned += earnedRaw(l);
    const key = l.product_id ?? l.product_name ?? "?";
    const p = products.get(key) ?? { productId: l.product_id ?? "", name: (l.product_name ?? "TikTok Shop product").replace(/\s+/g, " ").trim(), shop: l.shop_name ?? "", gmv: 0, orders: 0, commission: 0 };
    p.gmv += g;
    p.orders += 1;
    p.commission += lineCommission(l);
    products.set(key, p);
    if (l.content_id) {
      const c = content.get(l.content_id) ?? { id: l.content_id, type: l.content_type ?? "VIDEO", gmv: 0, orders: 0 };
      c.gmv += g;
      c.orders += 1;
      content.set(l.content_id, c);
    }
  }
  const gmv = inRange.reduce((a, l) => a + lineGmv(l), 0);
  return {
    gmv: round(gmv),
    orders: new Set(inRange.map((l) => l.order_id)).size,
    items: inRange.reduce((a, l) => a + (/REFUND/i.test(l.status ?? "") ? 0 : Math.max(0, l.quantity - l.refunded_quantity - l.returned_quantity)), 0),
    refunded: round(inRange.filter((l) => /REFUND/i.test(l.status ?? "")).reduce((a, l) => a + Number(l.price) * l.quantity, 0)),
    commission: round(inRange.reduce((a, l) => a + lineCommission(l), 0)),
    earned: round(inRange.reduce((a, l) => a + lineEarned(l), 0)),
    partnerShare: round(inRange.reduce((a, l) => a + linePartner(l), 0)),
    buckets: buckets.map(round),
    status: keys.map((k) => { const s = status.get(k)!; return { key: k, orders: s.orders.size, gmv: round(s.gmv), commission: round(s.commission), earned: round(s.earned) }; }),
    products: [...products.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 10).map((p) => ({ ...p, gmv: round(p.gmv), commission: round(p.commission) })),
    content: [...content.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 10).map((c) => ({ ...c, gmv: round(c.gmv) })),
    techwideGmv: round(techwideGmv),
    otherGmv: round(gmv - techwideGmv),
  };
}

const COLUMNS = "order_id,product_id,product_name,shop_name,price,quantity,refunded_quantity,returned_quantity,commission_estimated,commission_actual,commission_earned_estimated,commission_earned_actual,partner_share,campaign_id,content_type,content_id,status,created_at,synced_at";

/** The creator's order lines created in [from, to), read 1,000 at a time, 8 pages at once (busy creators have 50,000+). */
export async function linesBetween(userId: string, from: number, to: number): Promise<OrderLine[]> {
  const base = `creator_orders?user_id=eq.${userId}&created_at=gte.${new Date(from).toISOString()}&created_at=lt.${new Date(to).toISOString()}&select=${COLUMNS}&order=created_at.desc,order_id,line_id`;
  const head = await supabaseRest(`${base}&limit=1`, { headers: { prefer: "count=exact" } });
  const total = Number(head.headers.get("content-range")?.split("/")[1] ?? 0);
  const pages = Array.from({ length: Math.ceil(total / 1000) }, (_, i) => i * 1000);
  const out: OrderLine[] = [];
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  for (let i = 0; i < pages.length; i += 8) {
    const got = await Promise.all(pages.slice(i, i + 8).map(async (offset) => (await (await supabaseRest(`${base}&offset=${offset}&limit=1000`)).json()) as OrderLine[]));
    for (const page of got)
      for (const l of page)
        out.push({ ...l, price: Number(l.price), commission_estimated: num(l.commission_estimated), commission_actual: num(l.commission_actual), commission_earned_estimated: num(l.commission_earned_estimated), commission_earned_actual: num(l.commission_earned_actual), partner_share: num(l.partner_share) });
  }
  return out;
}

export type FrameData = {
  range: Range;
  stats: FrameStats;
  compare: { range: Range; gmv: number; buckets: number[] } | null;
  /** Titles and covers for the creator's own videos that made sales. */
  videos: Record<string, { title: string; cover: string | null; url: string | null }>;
  first: string | null;
  now: number;
};

/** Everything the Sales page shows for one time frame, source and comparison. */
export async function salesFrame(userId: string, key: string, source: Source, how: Compare, now = Date.now()): Promise<FrameData | null> {
  const [firstRow] = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&select=created_at&order=created_at.asc&limit=1`)).json()) as { created_at: string }[];
  const first = firstRow ? Date.parse(firstRow.created_at) : null;
  const range = frameRange(key, now, first);
  if (!range) return null;
  const cmp = compareRange(range, how);
  const [lines, techwide] = await Promise.all([linesBetween(userId, Math.min(range.from, cmp?.from ?? range.from), range.to), techwideCampaigns()]);
  const stats = frameStats(lines, range, techwide, source);
  const compare = cmp ? (() => { const c = frameStats(lines, cmp, techwide, source); return { range: cmp, gmv: c.gmv, buckets: c.buckets }; })() : null;
  const ids = stats.content.map((c) => c.id).filter((id) => /^\d{5,25}$/.test(id));
  const videos: FrameData["videos"] = {};
  if (ids.length) {
    const rows = (await (await supabaseRest(`tiktok_videos?video_id=in.(${ids.join(",")})&select=video_id,title,cover,share_url`)).json()) as { video_id: string; title: string | null; cover: string | null; share_url: string | null }[];
    for (const r of rows) videos[r.video_id] = { title: r.title || "Untitled video", cover: r.cover, url: r.share_url };
  }
  return { range, stats, compare, videos, first: firstRow?.created_at ?? null, now };
}
