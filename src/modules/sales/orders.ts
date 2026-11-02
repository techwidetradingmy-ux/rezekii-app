import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { noteRead } from "../creator-accounts/fresh.ts";
import { searchCreatorOrders, type AffiliateOrder, type OrderSku } from "../../integrations/tiktok-shop/creator.ts";

/** "RM12.00" or "12.00" → 12. TikTok writes money as text with the currency in front. */
export const money = (v: { amount?: string } | string | undefined | null): number | null => {
  const raw = typeof v === "string" ? v : v?.amount;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

type Line = OrderSku & { last_update_time?: number };

/** Sum of the amounts TikTok sent (null when it sent none of them). */
const total = (...vs: (OrderSku["price"] | undefined)[]) => {
  const got = vs.map((v) => money(v)).filter((v): v is number => v !== null);
  return got.length ? Math.round(got.reduce((a, b) => a + b, 0) * 100) / 100 : null;
};

/**
 * The commission split of one line: the full commission (standard + shop ads + bonus + reward fee) and the partner's part.
 * Until an order settles TikTok leaves shared_with_partner empty, so the partner's part is the full commission minus what the
 * creator keeps.
 */
export function commissionSplit(s: OrderSku) {
  const earnedEst = total(s.estimated_standard_commission, s.estimated_shop_ads_commission, s.estimated_bonus_commission, s.estimated_creator_commission_reward_fee);
  const earnedAct = total(s.actual_standard_commission, s.actual_shop_ads_commission, s.actual_bonus_commission, s.actual_creator_commission_reward_fee);
  const shared = money(s.shared_with_partner);
  const keep = money(s.actual_commission) ?? money(s.estimated_commission);
  const earned = earnedAct ?? earnedEst;
  const partner = shared !== null ? Math.abs(shared) : earned !== null && keep !== null && earned - keep > 0.005 ? Math.round((earned - keep) * 100) / 100 : earned !== null ? 0 : null;
  return { earnedEst, earnedAct, partner };
}
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
      ...(() => { const c = commissionSplit(s); return { commission_earned_estimated: c.earnedEst, commission_earned_actual: c.earnedAct, partner_share: c.partner }; })(),
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
/**
 * The first sync walks back in windows this long until a year passes with no orders. 30 days keeps a window small enough to
 * finish within one refresh even for very busy LIVE sellers (180-day windows hit the page cap at 5,000 lines and lost orders).
 */
const WINDOW_DAYS = 30;
const EMPTY_WINDOWS_TO_STOP = 12;
/** Safety cap per window: 1,000 pages of 50 lines. */
const MAX_PAGES = 1000;
const DAY = 86400;

/**
 * Saves every order created in [from, to), page by page. TikTok needs both dates: without a start it only returns recent orders.
 * `done` is false when time ran out before the last page.
 */
async function syncWindow(userId: string, token: string, from: number, to: number, stopAt: number): Promise<{ saved: number; done: boolean }> {
  let pageToken: string | undefined;
  let saved = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
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

/** Settled and refunded orders don't change again. */
const FINAL = ["SETTLED", "REFUNDED"];
const fullKey = (userId: string) => `orders_full:${userId}`;

/**
 * Where the re-read starts (owner, 2 Nov 2026: fetch only what changed): her oldest order that's still open (to settle or
 * awaiting payment) or 14 days back, whichever is earlier, and never more than 90 days back. Every 7 days all 90 days are read
 * anyway, in case TikTok changed an older order.
 */
async function resyncFrom(userId: string, now: number): Promise<{ from: number; full: boolean }> {
  const floor = now - RESYNC_DAYS * DAY;
  const [last] = (await (await supabaseRest(`app_settings?key=eq.${encodeURIComponent(fullKey(userId))}&select=value&limit=1`)).json().catch(() => [])) as { value: string }[];
  if (!last || now - Date.parse(last.value) / 1000 >= 7 * DAY) return { from: floor, full: true };
  const since = encodeURIComponent(new Date(floor * 1000).toISOString());
  const [open] = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&status=not.in.(${FINAL.join(",")})&created_at=gte.${since}&select=created_at&order=created_at.asc&limit=1`)).json().catch(() => [])) as { created_at: string }[];
  return { from: Math.max(floor, Math.min(now - 14 * DAY, open ? Math.floor(Date.parse(open.created_at) / 1000) : now)), full: false };
}

/** Re-reads the recent days, newest window first, so refunds and settlements are picked up even if time runs out. */
async function recent(userId: string, token: string, now: number, stopAt: number): Promise<number> {
  const { from, full } = await resyncFrom(userId, now);
  let saved = 0;
  let done = true;
  for (let to = now; to > from; to -= WINDOW_DAYS * DAY) {
    const w = await syncWindow(userId, token, Math.max(from, to - WINDOW_DAYS * DAY), to, stopAt);
    saved += w.saved;
    if (!w.done) {
      done = false;
      break;
    }
  }
  if (full && done)
    await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: fullKey(userId), value: new Date(now * 1000).toISOString(), updated_at: new Date().toISOString() }) });
  return saved;
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
 * Saves one creator's affiliate orders. Until their whole history is read it walks back in 30-day windows until a year passes
 * with no orders, carrying on next time from where time ran out; after that it re-reads the last 90 days. Returns how many order lines
 * were saved, or throws on a TikTok error.
 */
export async function syncCreatorOrders(userId: string, token: string, stopAt: number): Promise<number> {
  const saved = await readOrders(userId, token, stopAt);
  await noteRead(userId, "orders").catch(() => undefined);
  return saved;
}

async function readOrders(userId: string, token: string, stopAt: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const history = await readHistory(userId);
  if (history?.done) return recent(userId, token, now, stopAt);
  let saved = 0;
  // Carrying on from an unfinished read: keep the recent days up to date first.
  if (history) saved += await recent(userId, token, now, stopAt);
  let to = history?.to ?? now;
  let empty = history?.empty ?? 0;
  const oldest = now - 6 * 365 * DAY;
  while (empty < EMPTY_WINDOWS_TO_STOP && to > oldest) {
    const w = await syncWindow(userId, token, to - WINDOW_DAYS * DAY, to, stopAt);
    saved += w.saved;
    if (!w.done) break; // read this window again next time
    empty = w.saved ? 0 : empty + 1;
    to -= WINDOW_DAYS * DAY;
  }
  const value: History = { to, empty, done: empty >= EMPTY_WINDOWS_TO_STOP || to <= oldest };
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: `orders_history:${userId}`, value, updated_at: new Date().toISOString() }) });
  return saved;
}

/** The day of the creator's first saved affiliate order (Malaysia time), or null. */
export async function firstOrderDay(userId: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`creator_orders?user_id=eq.${userId}&select=created_at&order=created_at.asc&limit=1`)).json()) as { created_at: string }[];
  return row ? new Date(Date.parse(row.created_at) + 8 * 3600_000).toISOString().slice(0, 10) : null;
}

/**
 * A creator who hasn't opened Rezekii for this many days is away: the nightly refresh skips her own lists and reads her orders
 * once a week. Her pages read everything fresh when she's back (owner, 2 Nov 2026).
 */
export const AWAY_DAYS = 14;

/**
 * Creators whose orders are read: TikTok Shop linked and approved, the most recently active first (owner, 2 Nov 2026), with
 * whether each is away. Someone who opens Rezekii during a nightly run moves to the front, so a run that counts its place
 * passes over only her, and her page reads her data fresh anyway.
 */
export async function linkedCreatorsSeen(): Promise<{ id: string; away: boolean }[]> {
  const [approved, linked] = await Promise.all([
    supabaseRest("creator_access?status=eq.approved&select=user_id&order=user_id&limit=2000").then((r) => r.json() as Promise<{ user_id: string }[]>),
    supabaseRest("affiliate_connections?user_id=not.is.null&select=user_id&limit=2000").then((r) => r.json() as Promise<{ user_id: string }[]>),
  ]);
  const has = new Set(linked.map((r) => r.user_id));
  const ids = approved.map((r) => r.user_id).filter((id) => has.has(id));
  const seen = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 150) {
    const rows = (await (await supabaseRest(`app_users?id=in.(${ids.slice(i, i + 150).join(",")})&select=id,last_seen_at`)).json()) as { id: string; last_seen_at: string | null }[];
    for (const r of rows) seen.set(r.id, r.last_seen_at ? Date.parse(r.last_seen_at) : 0);
  }
  const awayBefore = Date.now() - AWAY_DAYS * DAY * 1000;
  return ids
    .map((id) => ({ id, at: seen.get(id) ?? 0 }))
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .map(({ id, at }) => ({ id, away: at < awayBefore }));
}

export const linkedCreators = async (): Promise<string[]> => (await linkedCreatorsSeen()).map((c) => c.id);
/** Linked creators who used Rezekii in the last 14 days, the most recent first: their own lists are made ahead each night. */
export const activeCreators = async (): Promise<string[]> => (await linkedCreatorsSeen()).filter((c) => !c.away).map((c) => c.id);
