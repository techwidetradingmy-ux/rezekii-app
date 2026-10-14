import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { searchCreatorOrders, type AffiliateOrder, type OrderSku } from "../../integrations/tiktok-shop/creator.ts";

/** "RM12.00" or "12.00" → 12. TikTok writes money as text with the currency in front. */
export const money = (v: { amount?: string } | string | undefined | null): number | null => {
  const raw = typeof v === "string" ? v : v?.amount;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

type Line = OrderSku & { last_update_time?: number };
const iso = (unix?: number) => (unix ? new Date((unix > 1e12 ? unix : unix * 1000)).toISOString() : null);

/** One saved row per order line. */
export function orderRows(userId: string, orders: AffiliateOrder[]) {
  return orders.flatMap((o) =>
    ([o.skus].flat().filter(Boolean) as Line[]).map((s, i) => ({
      order_id: o.id,
      line_id: s.id ?? String(i),
      user_id: userId,
      product_id: s.product_id ?? null,
      product_name: s.product_name ?? null,
      shop_name: s.shop_name ?? null,
      price: money(s.price) ?? 0,
      quantity: s.quantity ?? 0,
      refunded_quantity: s.refunded_quantity ?? 0,
      returned_quantity: s.returned_quantity ?? 0,
      commission_estimated: money(s.estimated_commission),
      commission_actual: money(s.actual_commission),
      campaign_id: s.campaign_id || null,
      link_tag: s.tag || null,
      content_type: s.content_type ?? null,
      content_id: s.content_id ?? null,
      status: o.status ?? null,
      created_at: iso(o.create_time) ?? new Date().toISOString(),
      updated_at: iso(s.last_update_time),
      synced_at: new Date().toISOString(),
    })),
  );
}

/** Days re-read on every sync, so orders that settle or get refunded later are updated. */
export const RESYNC_DAYS = 90;
/** The first sync walks back in windows this long until it finds two empty ones in a row. */
const WINDOW_DAYS = 180;
const DAY = 86400;

/**
 * Saves every order created in [from, to), page by page. TikTok needs both dates: without a start it only returns recent orders.
 * `done` is false when time ran out before the last page.
 */
async function syncWindow(userId: string, token: string, from: number, to: number, stopAt: number): Promise<{ saved: number; done: boolean }> {
  let pageToken: string | undefined;
  let saved = 0;
  for (let page = 0; page < 100; page++) {
    if (Date.now() >= stopAt) return { saved, done: false };
    const r = await searchCreatorOrders(token, { pageSize: 50, pageToken, createTimeGe: from, createTimeLt: to });
    if (r.code !== 0) throw new Error(`orders ${r.code} ${r.message}`);
    const rows = orderRows(userId, r.data?.orders ?? []);
    if (rows.length)
      await supabaseRest("creator_orders?on_conflict=order_id,line_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    saved += rows.length;
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  return { saved, done: true };
}

/** How far the first read of a creator's whole history has got: `to` is the next window's end, `empty` the empty windows in a row. */
type History = { to: number; empty: number; done: boolean };
const historyKey = (userId: string) => encodeURIComponent(`orders_history:${userId}`);

async function readHistory(userId: string): Promise<History | null> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${historyKey(userId)}&select=value&limit=1`)).json()) as { value: History }[];
  return row?.value ?? null;
}

/** True once the creator's whole order history has been read. */
export async function historyDone(userId: string): Promise<boolean> {
  return (await readHistory(userId))?.done === true;
}

/**
 * Saves one creator's affiliate orders. Until their whole history is read it walks back in 180-day windows until two come back
 * empty, carrying on next time from where time ran out; after that it re-reads the last 90 days. Returns how many order lines
 * were saved, or throws on a TikTok error.
 */
export async function syncCreatorOrders(userId: string, token: string, stopAt: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const history = await readHistory(userId);
  if (history?.done) return (await syncWindow(userId, token, now - RESYNC_DAYS * DAY, now, stopAt)).saved;
  let saved = 0;
  // Carrying on from an unfinished read: keep the recent days up to date first.
  if (history) saved += (await syncWindow(userId, token, now - RESYNC_DAYS * DAY, now, stopAt)).saved;
  let to = history?.to ?? now;
  let empty = history?.empty ?? 0;
  const oldest = now - 6 * 365 * DAY;
  while (empty < 2 && to > oldest) {
    const w = await syncWindow(userId, token, to - WINDOW_DAYS * DAY, to, stopAt);
    saved += w.saved;
    if (!w.done) break; // read this window again next time
    empty = w.saved ? 0 : empty + 1;
    to -= WINDOW_DAYS * DAY;
  }
  const value: History = { to, empty, done: empty >= 2 || to <= oldest };
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: `orders_history:${userId}`, value, updated_at: new Date().toISOString() }) });
  return saved;
}

/** The day of the creator's first saved affiliate order (Malaysia time), or null. */
export async function firstOrderDay(userId: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&select=created_at&order=created_at.asc&limit=1`)).json()) as { created_at: string }[];
  return row ? new Date(Date.parse(row.created_at) + 8 * 3600_000).toISOString().slice(0, 10) : null;
}

/** Creators whose orders are read: TikTok Shop linked and approved. */
export async function linkedCreators(): Promise<string[]> {
  const [approved, linked] = await Promise.all([
    supabaseRest("creator_access?status=eq.approved&select=user_id&order=user_id&limit=2000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("affiliate_connections?user_id=not.is.null&select=user_id&limit=2000").then((r) => r.json() as Promise<{ user_id: string }[]>),
  ]);
  const has = new Set(linked.map((r) => r.user_id));
  return approved.map((r) => r.user_id).filter((id) => has.has(id));
}
