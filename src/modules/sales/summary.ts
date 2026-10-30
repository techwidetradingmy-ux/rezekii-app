import { supabaseRest } from "../../integrations/supabase/rest.ts";

/** One saved order line, as the Sales and Account pages read it. */
export type OrderLine = {
  order_id: string; product_id: string | null; product_name: string | null; shop_name: string | null; price: number; quantity: number;
  refunded_quantity: number; returned_quantity: number; commission_estimated: number | null; commission_actual: number | null;
  /** The full commission before a partner's share, and the partner's part (creators who work with an agency). */
  commission_earned_estimated?: number | null; commission_earned_actual?: number | null; partner_share?: number | null;
  campaign_id: string | null; content_type: string | null; content_id: string | null; status: string | null; created_at: string; synced_at: string;
};

export type Source = "all" | "techwide" | "other";
export type SalesSummary = {
  days: number;
  gmv: number; prevGmv: number; commission: number; toSettle: number; refunded: number;
  /** The full commission before a partner's share, and the partner's part; `commission` is what the creator keeps. */
  earned: number; partnerShare: number;
  orders: number; items: number;
  /** GMV per Malaysia day, oldest first, `days` long. */
  daily: number[];
  /** Top products by GMV. */
  /** `earned`: the full commission (what TikTok shows when it pays the creator's agency); `image` added by the page. */
  products: { productId: string; name: string; shop: string; gmv: number; orders: number; commission: number; earned: number; image?: string | null }[];
  /** Sales per video or LIVE (content id), best first. */
  content: { id: string; type: string; gmv: number; orders: number }[];
  /** GMV through Techwide's TAP campaigns and through everything else (other shops and partners). */
  techwideGmv: number; otherGmv: number;
  syncedAt: string | null;
};

const DAY = 86400_000;
const MYT = 8 * 3600_000;
const mytDay = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);

/** What a line sold for: TikTok's price is per unit, so the units that weren't refunded or returned times the price. */
export const lineGmv = (l: Pick<OrderLine, "price" | "quantity" | "refunded_quantity" | "returned_quantity" | "status">) =>
  /REFUND/i.test(l.status ?? "") ? 0 : Number(l.price) * Math.max(0, l.quantity - l.refunded_quantity - l.returned_quantity);
export const lineCommission = (l: OrderLine) => (/REFUND/i.test(l.status ?? "") ? 0 : Number(l.commission_actual ?? l.commission_estimated ?? 0));
export const lineEarned = (l: OrderLine) => (/REFUND/i.test(l.status ?? "") ? 0 : Number(l.commission_earned_actual ?? l.commission_earned_estimated ?? l.commission_actual ?? l.commission_estimated ?? 0));
export const linePartner = (l: OrderLine) => (/REFUND/i.test(l.status ?? "") ? 0 : Number(l.partner_share ?? 0));

let campaignCache: { at: number; ids: Set<string> } | null = null;
/** Techwide's TAP campaign IDs, from the latest daily refresh (kept 10 minutes). */
export async function techwideCampaigns(): Promise<Set<string>> {
  if (campaignCache && Date.now() - campaignCache.at < 10 * 60_000) return campaignCache.ids;
  const [row] = (await (await supabaseRest("market_snapshots?dataset=eq.tap_campaigns&select=items&order=as_of.desc&limit=1")).json()) as { items: { id: string }[] }[];
  campaignCache = { at: Date.now(), ids: new Set((row?.items ?? []).map((c) => String(c.id))) };
  return campaignCache.ids;
}

/** Sums one creator's saved orders over the last `days` days (and the `days` before, for the change), Malaysia time. */
export function summarize(lines: OrderLine[], days: number, now: number, techwide: Set<string>, source: Source = "all"): SalesSummary {
  const from = now - days * DAY;
  const prevFrom = from - days * DAY;
  const pick = (l: OrderLine) => source === "all" || (source === "techwide") === (!!l.campaign_id && techwide.has(l.campaign_id));
  const inRange = lines.filter((l) => Date.parse(l.created_at) >= from && pick(l));
  const prev = lines.filter((l) => { const t = Date.parse(l.created_at); return t >= prevFrom && t < from && pick(l); });
  const dayIndex = new Map(Array.from({ length: days }, (_, i) => [mytDay(now - (days - 1 - i) * DAY), i]));
  const daily = new Array(days).fill(0);
  const products = new Map<string, SalesSummary["products"][number]>();
  const content = new Map<string, SalesSummary["content"][number]>();
  let techwideGmv = 0;
  for (const l of inRange) {
    const g = lineGmv(l);
    const i = dayIndex.get(mytDay(Date.parse(l.created_at)));
    if (i !== undefined) daily[i] += g;
    if (l.campaign_id && techwide.has(l.campaign_id)) techwideGmv += g;
    const key = l.product_id ?? l.product_name ?? "?";
    const p = products.get(key) ?? { productId: l.product_id ?? "", name: (l.product_name ?? "TikTok Shop product").replace(/\s+/g, " ").trim(), shop: l.shop_name ?? "", gmv: 0, orders: 0, commission: 0, earned: 0 };
    p.gmv += g;
    p.orders += 1;
    p.commission += lineCommission(l);
    p.earned += lineEarned(l);
    products.set(key, p);
    if (l.content_id) {
      const c = content.get(l.content_id) ?? { id: l.content_id, type: l.content_type ?? "VIDEO", gmv: 0, orders: 0 };
      c.gmv += g;
      c.orders += 1;
      content.set(l.content_id, c);
    }
  }
  const gmv = inRange.reduce((a, l) => a + lineGmv(l), 0);
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    days,
    gmv: round(gmv),
    prevGmv: round(prev.reduce((a, l) => a + lineGmv(l), 0)),
    commission: round(inRange.reduce((a, l) => a + lineCommission(l), 0)),
    earned: round(inRange.reduce((a, l) => a + lineEarned(l), 0)),
    partnerShare: round(inRange.reduce((a, l) => a + linePartner(l), 0)),
    toSettle: round(inRange.filter((l) => /TO.?SETTLE/i.test(l.status ?? "")).reduce((a, l) => a + lineCommission(l), 0)),
    refunded: round(inRange.filter((l) => /REFUND/i.test(l.status ?? "")).reduce((a, l) => a + Number(l.price) * l.quantity, 0)),
    orders: new Set(inRange.map((l) => l.order_id)).size,
    items: inRange.reduce((a, l) => a + (/REFUND/i.test(l.status ?? "") ? 0 : Math.max(0, l.quantity - l.refunded_quantity - l.returned_quantity)), 0),
    daily: daily.map(round),
    products: [...products.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 10).map((p) => ({ ...p, gmv: round(p.gmv), commission: round(p.commission), earned: round(p.earned) })),
    content: [...content.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 10).map((c) => ({ ...c, gmv: round(c.gmv) })),
    techwideGmv: round(techwideGmv),
    otherGmv: round(gmv - techwideGmv),
    syncedAt: lines.reduce<string | null>((m, l) => (!m || l.synced_at > m ? l.synced_at : m), null),
  };
}

/** A creator's saved order lines from the last `days` × 2 days (enough for the change against the period before). */
export async function orderLines(userId: string, days: number, now = Date.now()): Promise<OrderLine[]> {
  const since = new Date(now - days * 2 * DAY).toISOString();
  const out: OrderLine[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&created_at=gte.${since}&select=order_id,product_id,product_name,shop_name,price,quantity,refunded_quantity,returned_quantity,commission_estimated,commission_actual,commission_earned_estimated,commission_earned_actual,partner_share,campaign_id,content_type,content_id,status,created_at,synced_at&order=created_at.desc&offset=${offset}&limit=1000`)).json()) as OrderLine[];
    const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
    out.push(...page.map((l) => ({ ...l, price: Number(l.price), commission_estimated: num(l.commission_estimated), commission_actual: num(l.commission_actual), commission_earned_estimated: num(l.commission_earned_estimated), commission_earned_actual: num(l.commission_earned_actual), partner_share: num(l.partner_share) })));
    if (page.length < 1000) return out;
  }
}

/** The Sales summary for one creator. */
export async function salesSummary(userId: string, days: number, source: Source = "all", now = Date.now()): Promise<SalesSummary> {
  const [lines, techwide] = await Promise.all([orderLines(userId, days, now), techwideCampaigns()]);
  return summarize(lines, days, now, techwide, source);
}

/** When this creator's orders were last read from TikTok, or null if never. */
export async function lastOrderSync(userId: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&select=synced_at&order=synced_at.desc&limit=1`)).json()) as { synced_at: string }[];
  return row?.synced_at ?? null;
}
