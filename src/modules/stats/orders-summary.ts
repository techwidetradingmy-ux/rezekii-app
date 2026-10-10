import type { AffiliateOrder, OrderSku } from "../../integrations/tiktok-shop/creator.ts";

export type Row = { key: string; label: string; orders: number; units: number; gmv: number; commission: number };
export type OrdersSummary = {
  orders: number;
  units: number;
  refundedUnits: number;
  /** Gross GMV: price × quantity, before refunds. */
  gmv: number;
  /** Commission: actual when TikTok has settled it, otherwise estimated. */
  commission: number;
  currency: string;
  earliest?: number;
  latest?: number;
  byStatus: Record<string, number>;
  byMonth: Row[];
  byProduct: Row[];
  byContent: Row[];
  byTag: Row[];
  byCreator: Row[];
};

const num = (m?: { amount: string }) => (m && m.amount ? parseFloat(m.amount) || 0 : 0);
const skusOf = (o: AffiliateOrder): OrderSku[] => (Array.isArray(o.skus) ? o.skus : o.skus ? [o.skus] : []);
const monthOf = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).slice(0, 7);

function bump(map: Map<string, Row>, key: string, label: string, orderId: string, seen: Set<string>, units: number, gmv: number, commission: number) {
  const r = map.get(key) ?? { key, label, orders: 0, units: 0, gmv: 0, commission: 0 };
  const tag = key + "|" + orderId;
  if (!seen.has(tag)) { r.orders++; seen.add(tag); }
  r.units += units; r.gmv += gmv; r.commission += commission;
  map.set(key, r);
}

const sorted = (m: Map<string, Row>) => [...m.values()].sort((a, b) => b.gmv - a.gmv);

/** Turns raw affiliate orders (creator or TAP) into totals and top lists. Pure: no network. */
export function summarizeOrders(orders: AffiliateOrder[]): OrdersSummary {
  const months = new Map<string, Row>(), products = new Map<string, Row>(), content = new Map<string, Row>(), tags = new Map<string, Row>(), creators = new Map<string, Row>();
  const seen = new Set<string>();
  const byStatus: Record<string, number> = {};
  let units = 0, refundedUnits = 0, gmv = 0, commission = 0, currency = "", earliest: number | undefined, latest: number | undefined;
  for (const o of orders) {
    byStatus[o.status ?? "UNKNOWN"] = (byStatus[o.status ?? "UNKNOWN"] ?? 0) + 1;
    if (o.create_time) { earliest = Math.min(earliest ?? o.create_time, o.create_time); latest = Math.max(latest ?? o.create_time, o.create_time); }
    for (const s of skusOf(o)) {
      const q = s.quantity ?? 0;
      const g = num(s.price) * q;
      const c = s.actual_commission ? num(s.actual_commission) : num(s.estimated_commission);
      currency ||= s.price?.currency ?? "";
      units += q; refundedUnits += (s.refunded_quantity ?? 0) + (s.returned_quantity ?? 0); gmv += g; commission += c;
      if (o.create_time) bump(months, monthOf(o.create_time), monthOf(o.create_time), o.id, seen, q, g, c);
      bump(products, s.product_id ?? "?", s.product_name ?? s.product_id ?? "?", o.id, seen, q, g, c);
      if (s.content_id) bump(content, s.content_id, (s.content_type ?? "?") + " " + s.content_id, o.id, seen, q, g, c);
      bump(tags, s.tag || "(no tag)", s.tag || "(no tag)", o.id, seen, q, g, c);
      if (s.creator_username) bump(creators, s.creator_username, "@" + s.creator_username, o.id, seen, q, g, c);
    }
  }
  return {
    orders: orders.length, units, refundedUnits, gmv, commission, currency, earliest, latest, byStatus,
    byMonth: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)),
    byProduct: sorted(products), byContent: sorted(content), byTag: sorted(tags), byCreator: sorted(creators),
  };
}
