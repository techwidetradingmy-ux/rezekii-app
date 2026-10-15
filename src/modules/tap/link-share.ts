import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { frameRange, type Range } from "../sales/frames.ts";
import { lineGmv, type OrderLine } from "../sales/summary.ts";

/** What one converted link sold through TikTok's link-share channel. */
export type LinkPerf = { orders: number; items: number; gmv: number; commission: number; last: string | null };
export type LinkRef = { product_id: string; tag: string | null; link: string; made_at: string };
/** Link-share sales of one product (and tag) through links made outside Rezekii; TikTok doesn't say which link. */
export type OutsideSales = LinkPerf & { product_id: string; product_name: string | null; image: string | null; tag: string | null };
type Line = Pick<OrderLine, "order_id" | "product_id" | "price" | "quantity" | "refunded_quantity" | "returned_quantity" | "status" | "commission_estimated" | "commission_actual" | "commission_earned_estimated" | "commission_earned_actual" | "created_at"> & { link_tag: string | null; product_name?: string | null };
type Acc = LinkPerf & { ids: Set<string> };
/** Orders counted once each (an order can hold several products): all, via Rezekii links, via other links, and by tag. */
export type LinkShareCounts = { all: number; mine: number; outside: number; byTag: Record<string, number> };

const round = (v: number) => Math.round(v * 100) / 100;
const isRefund = (s: string | null) => /REFUND/i.test(s ?? "");
/** The full commission on a line, before an agency's share (as the Sales page shows it). */
const earned = (l: Line) => (isRefund(l.status) ? 0 : Number(l.commission_earned_actual ?? l.commission_earned_estimated ?? l.commission_actual ?? l.commission_estimated ?? 0));

function add(out: Record<string, Acc>, key: string, line: Line) {
  const p = (out[key] ??= { orders: 0, items: 0, gmv: 0, commission: 0, last: null, ids: new Set() });
  if (!isRefund(line.status)) {
    p.ids.add(line.order_id);
    p.items += Math.max(0, line.quantity - line.refunded_quantity - line.returned_quantity);
  }
  p.gmv += lineGmv(line);
  p.commission += earned(line);
  if (!p.last || line.created_at > p.last) p.last = line.created_at;
}
const done = ({ ids, ...p }: Acc): LinkPerf => ({ ...p, orders: ids.size, gmv: round(p.gmv), commission: round(p.commission) });

/**
 * The creator's link-share sales, from their own TikTok orders in TikTok's link-share channel only (owner, 15 Oct 2026:
 * link share is its own sales channel; nothing else is counted here or changed elsewhere). TikTok puts the link's tag on each
 * order, so an order belongs to the Rezekii link with the same product and tag, the newest one made before the order
 * (`byLink`). Every other link-share order came from a link made outside Rezekii; those are added up by product and tag
 * (`outside`, owner 16 Oct 2026), since TikTok doesn't say which link. Pure.
 */
export function attributeLinkSales(links: LinkRef[], lines: Line[]): { byLink: Record<string, LinkPerf>; outside: (LinkPerf & { product_id: string; tag: string | null })[]; counts: LinkShareCounts } {
  const groups = new Map<string, LinkRef[]>();
  for (const l of links) {
    const key = `${l.product_id}|${l.tag ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  for (const g of groups.values()) g.sort((a, b) => a.made_at.localeCompare(b.made_at));
  const mine: Record<string, Acc> = {};
  const other: Record<string, Acc> = {};
  const seen = { all: new Set<string>(), mine: new Set<string>(), outside: new Set<string>() };
  const byTag: Record<string, Set<string>> = {};
  for (const line of lines) {
    const key = `${line.product_id}|${line.link_tag ?? ""}`;
    const link = groups.get(key)?.filter((l) => l.made_at <= line.created_at).at(-1);
    if (link) add(mine, link.link, line);
    else add(other, key, line);
    if (isRefund(line.status)) continue;
    seen.all.add(line.order_id);
    seen[link ? "mine" : "outside"].add(line.order_id);
    (byTag[line.link_tag ?? "no tag"] ??= new Set()).add(line.order_id);
  }
  return {
    byLink: Object.fromEntries(Object.entries(mine).map(([k, p]) => [k, done(p)])),
    outside: Object.entries(other).map(([k, p]) => ({ ...done(p), product_id: k.slice(0, k.indexOf("|")), tag: k.slice(k.indexOf("|") + 1) || null })),
    counts: { all: seen.all.size, mine: seen.mine.size, outside: seen.outside.size, byTag: Object.fromEntries(Object.entries(byTag).map(([t, ids]) => [t, ids.size])) },
  };
}

/** All the creator's link-share order lines (TikTok marks them LINKSHARE), oldest first. */
async function linkShareLines(userId: string): Promise<Line[]> {
  const out: Line[] = [];
  const cols = "order_id,product_id,product_name,link_tag,price,quantity,refunded_quantity,returned_quantity,status,commission_estimated,commission_actual,commission_earned_estimated,commission_earned_actual,created_at";
  for (let offset = 0; ; offset += 1000) {
    const rows = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&content_type=ilike.*LINK*&select=${cols}&order=created_at,order_id&offset=${offset}&limit=1000`)).json()) as Line[];
    out.push(...rows.map((r) => ({ ...r, price: Number(r.price) })));
    if (rows.length < 1000) return out;
  }
}

/** Product pictures from the TAP catalogue, where it has them. */
async function productImages(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const rows = (await (await supabaseRest(`tap_catalog?product_id=in.(${ids.slice(i, i + 100).join(",")})&select=product_id,image`)).json()) as { product_id: string; image: string | null }[];
    for (const r of rows) if (r.image) out.set(r.product_id, r.image);
  }
  return out;
}

/** A Techwide TAP link adds the product to the creator's showcase; it isn't a share link, so it has no link-share sales. */
export const isTapLink = (link: string) => link.startsWith("https://affiliate.tiktok.com/");

/**
 * The creator's link-share sales in a time frame (the Sales page's frames and words, Malaysia time; owner, 16 Oct 2026): by
 * Rezekii share link (TAP links left out), and from links made outside Rezekii, newest first. Null for an unknown frame.
 */
export async function linkShareReport(userId: string, links: LinkRef[], frame = "all", now = Date.now()): Promise<{ perf: Record<string, LinkPerf>; outside: OutsideSales[]; counts: LinkShareCounts; range: Range } | null> {
  const all = await linkShareLines(userId);
  const range = frameRange(frame, now, all.length ? Date.parse(all[0].created_at) : null);
  if (!range) return null;
  const lines = all.filter((l) => { const t = Date.parse(l.created_at); return t >= range.from && t < range.to; });
  const { byLink, outside, counts } = attributeLinkSales(links.filter((l) => !isTapLink(l.link)), lines);
  if (!lines.length) return { perf: {}, outside: [], counts, range };
  const names = new Map(lines.filter((l) => l.product_name).map((l) => [l.product_id, l.product_name ?? null]));
  const ids = [...new Set(outside.map((o) => o.product_id))].filter((id) => /^\d{5,25}$/.test(id));
  const images = await productImages(ids).catch(() => new Map<string, string>());
  return {
    perf: byLink,
    counts,
    range,
    outside: outside
      .map((o) => ({ ...o, product_name: names.get(o.product_id) ?? null, image: images.get(o.product_id) ?? null }))
      .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? "")),
  };
}
