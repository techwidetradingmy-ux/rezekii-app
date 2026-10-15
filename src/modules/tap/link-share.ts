import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { lineGmv, type OrderLine } from "../sales/summary.ts";

/** What one converted link sold through TikTok's link-share channel. */
export type LinkPerf = { orders: number; items: number; gmv: number; commission: number; last: string | null };
export type LinkRef = { product_id: string; tag: string | null; link: string; made_at: string };
type Line = Pick<OrderLine, "order_id" | "product_id" | "price" | "quantity" | "refunded_quantity" | "returned_quantity" | "status" | "commission_estimated" | "commission_actual" | "commission_earned_estimated" | "commission_earned_actual" | "created_at"> & { link_tag: string | null };

const round = (v: number) => Math.round(v * 100) / 100;
const isRefund = (s: string | null) => /REFUND/i.test(s ?? "");
/** The full commission on a line, before an agency's share (as the Sales page shows it). */
const earned = (l: Line) => (isRefund(l.status) ? 0 : Number(l.commission_earned_actual ?? l.commission_earned_estimated ?? l.commission_actual ?? l.commission_estimated ?? 0));

/**
 * Sales of each converted link, from the creator's own TikTok orders in TikTok's link-share channel only (owner, 15 Oct 2026:
 * link share is its own sales channel; nothing else is counted here or changed elsewhere). TikTok puts the link's tag on each
 * order, so an order belongs to the link with the same product and tag, the newest one made before the order. Pure.
 */
export function attributeLinkSales(links: LinkRef[], lines: Line[]): Record<string, LinkPerf> {
  const groups = new Map<string, LinkRef[]>();
  for (const l of links) {
    const key = `${l.product_id}|${l.tag ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  for (const g of groups.values()) g.sort((a, b) => a.made_at.localeCompare(b.made_at));
  const out: Record<string, LinkPerf & { ids: Set<string> }> = {};
  for (const line of lines) {
    const g = groups.get(`${line.product_id}|${line.link_tag ?? ""}`);
    const link = g?.filter((l) => l.made_at <= line.created_at).at(-1);
    if (!link) continue;
    const p = (out[link.link] ??= { orders: 0, items: 0, gmv: 0, commission: 0, last: null, ids: new Set() });
    if (!isRefund(line.status)) {
      p.ids.add(line.order_id);
      p.items += Math.max(0, line.quantity - line.refunded_quantity - line.returned_quantity);
    }
    p.gmv += lineGmv(line);
    p.commission += earned(line);
    if (!p.last || line.created_at > p.last) p.last = line.created_at;
  }
  return Object.fromEntries(Object.entries(out).map(([k, { ids, ...p }]) => [k, { ...p, orders: ids.size, gmv: round(p.gmv), commission: round(p.commission) }]));
}

/** The creator's link-share order lines for these products (TikTok marks them LINKSHARE), oldest first. */
async function linkShareLines(userId: string, productIds: string[]): Promise<Line[]> {
  const out: Line[] = [];
  const cols = "order_id,product_id,link_tag,price,quantity,refunded_quantity,returned_quantity,status,commission_estimated,commission_actual,commission_earned_estimated,commission_earned_actual,created_at";
  for (let i = 0; i < productIds.length; i += 100) {
    const ids = productIds.slice(i, i + 100).join(",");
    const rows = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&content_type=ilike.*LINK*&product_id=in.(${ids})&select=${cols}&order=created_at&limit=10000`)).json()) as Line[];
    out.push(...rows.map((r) => ({ ...r, price: Number(r.price) })));
  }
  return out;
}

/** Each converted link's link-share sales, by link. */
export async function linkPerformance(userId: string, links: LinkRef[]): Promise<Record<string, LinkPerf>> {
  const ids = [...new Set(links.map((l) => l.product_id).filter((id) => /^\d{5,25}$/.test(id)))];
  if (!ids.length) return {};
  return attributeLinkSales(links, await linkShareLines(userId, ids));
}
