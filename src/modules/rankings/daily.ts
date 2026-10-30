import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { levelMap } from "./levels-map.ts";
import { rankings } from "./store.ts";

/** One creator on one day's TikTok top 100. GMV is TikTok's range in RM. `prev`: rank the day before (null: not in it). */
export type DailyRow = {
  rank: number; user: string; nick: string; followers: number; lo: number; hi: number; avatar: string | null;
  prev: number | null; days: number; history: (number | null)[]; rezekii: boolean;
  /** TikTok Shop creator level, when the monthly level pass has found it. */
  lv?: number | null;
};
export type HallRow = { user: string; nick: string; avatar: string | null; days: number; best: number; history: (number | null)[]; rezekii: boolean; lv?: number | null };
export type DailyBoard = {
  date: string;
  /** Every saved day, newest first. */
  dates: string[];
  /** The 14 days the history strips cover, oldest first, ending on `date`. */
  historyDays: string[];
  rows: DailyRow[];
  hall: HallRow[];
  /** Days saved in all (since Rezekii started saving TikTok's daily list). */
  saved: number;
  first: string | null;
  /** "1D": TikTok's daily list; "7D": its list for the 7 days to `date` (Weekly). */
  period?: "1D" | "7D";
};

type Item = { rank?: number; user_name?: string; nick_name?: string; followers_count?: number; gmv_range?: string };
type Day = { as_of: string; items: Item[] };

/** "MYR5496500.68~MYR10232198.52" → [5496500.68, 10232198.52]. */
export const gmvRange = (s: string | undefined): [number, number] => {
  const [lo, hi] = String(s ?? "").split("~").map((x) => Number(x.replace(/[^0-9.]/g, "")) || 0);
  return [lo ?? 0, hi ?? lo ?? 0];
};

/**
 * One day's top 100 with each creator's change, days in the top 100 (every saved day) and rank history; the Hall of Fame is
 * the most consistent creators across every saved day. `rezekii`: TikTok usernames of linked Rezekii creators.
 */
export function buildBoard(days: Day[], date: string, rezekii: Set<string>, avatars: Record<string, string | null>): DailyBoard | null {
  const sorted = [...days].sort((a, b) => (a.as_of < b.as_of ? 1 : -1));
  const idx = sorted.findIndex((d) => d.as_of === date);
  if (idx < 0) return null;
  const rankOn = new Map<string, Map<string, number>>();
  const count = new Map<string, number>();
  const best = new Map<string, number>();
  const nick = new Map<string, string>();
  for (const d of sorted) {
    const m = new Map<string, number>();
    for (const it of d.items) {
      const u = (it.user_name ?? "").toLowerCase();
      if (!u || !it.rank) continue;
      m.set(u, it.rank);
      count.set(u, (count.get(u) ?? 0) + 1);
      best.set(u, Math.min(best.get(u) ?? 999, it.rank));
      if (!nick.has(u)) nick.set(u, it.nick_name ?? u);
    }
    rankOn.set(d.as_of, m);
  }
  const historyDays = sorted.slice(idx, idx + 14).map((d) => d.as_of).reverse();
  const history = (u: string) => historyDays.map((d) => rankOn.get(d)?.get(u) ?? null);
  const before = sorted[idx + 1]?.as_of;
  const rows: DailyRow[] = [...sorted[idx].items]
    .filter((it) => it.user_name && it.rank)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((it) => {
      const u = it.user_name!.toLowerCase();
      const [lo, hi] = gmvRange(it.gmv_range);
      return {
        rank: it.rank!, user: it.user_name!, nick: it.nick_name ?? it.user_name!, followers: it.followers_count ?? 0, lo, hi, avatar: avatars[u] ?? null,
        prev: before ? rankOn.get(before)?.get(u) ?? null : null, days: count.get(u) ?? 1, history: history(u), rezekii: rezekii.has(u),
      };
    });
  const hall: HallRow[] = [...count.entries()]
    .sort((a, b) => b[1] - a[1] || (best.get(a[0]) ?? 999) - (best.get(b[0]) ?? 999))
    .slice(0, 10)
    .map(([u, n]) => ({ user: u, nick: nick.get(u) ?? u, avatar: avatars[u] ?? null, days: n, best: best.get(u) ?? 0, history: history(u), rezekii: rezekii.has(u) }));
  return { date, dates: sorted.map((d) => d.as_of), historyDays, rows, hall, saved: sorted.length, first: sorted.at(-1)?.as_of ?? null };
}

const cache = new Map<string, { at: number; days: Day[] }>();

/**
 * One day's list: TikTok's RM list as TikTok gives it (no conversion), keeping only creators TikTok's US$ list also has. A creator
 * in the RM list alone has figures that don't add up (13 Oct 2026: RM43.6M for one day, yet missing from TikTok's 30-day top 3).
 */
export function inBoth(L: Item[], U: Item[]): Item[] {
  if (!U.length) return L;
  const us = new Set(U.map((u) => u.user_name));
  // Numbered again from 1 in TikTok's order, so a left-out creator leaves no gap.
  return L.filter((l) => us.has(l.user_name)).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((l, i) => ({ ...l, rank: i + 1 }));
}

/**
 * TikTok's saved top-100 lists of affiliate creators (daily, or for the 7 days to each day), kept 10 minutes. Shop accounts (a
 * brand's official account and its channel accounts) are sellers and are left out (owner, 14 Oct 2026).
 */
async function savedDays(period: "1D" | "7D"): Promise<Day[]> {
  const hit = cache.get(period);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.days;
  const slots = [`${period}|AFFILIATE|LOCAL`, `${period}|AFFILIATE|USD`].map(encodeURIComponent).join(",");
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.creators&slot=in.(${slots})&select=as_of,slot,items&order=as_of.desc&limit=120`)).json()) as (Day & { slot: string })[];
  const byDay = new Map<string, { L: Item[]; U: Item[] }>();
  for (const r of rows) {
    if (!Array.isArray(r.items) || !r.items.length) continue;
    const d = byDay.get(r.as_of) ?? { L: [], U: [] };
    if (r.slot.endsWith("USD")) d.U = r.items;
    else d.L = r.items;
    byDay.set(r.as_of, d);
  }
  const days = [...byDay.entries()].filter(([, d]) => d.L.length).map(([as_of, d]) => ({ as_of, items: inBoth(d.L, d.U) }));
  cache.set(period, { at: Date.now(), days });
  return days;
}

/** Linked Rezekii creators' TikTok usernames, lower case. */
async function rezekiiCreators(): Promise<Set<string>> {
  const rows = (await (await supabaseRest("affiliate_connections?user_id=not.is.null&select=username&limit=2000")).json()) as { username?: string | null }[];
  return new Set(rows.map((r) => r.username).filter((x): x is string => !!x).map((x) => x.toLowerCase()));
}

/** The Daily Top 100 Creators board for `date` (the newest saved day when not given or not saved); `period` "7D": Weekly. */
export async function dailyTop100(date?: string, period: "1D" | "7D" = "1D"): Promise<DailyBoard | null> {
  const days = await savedDays(period);
  if (!days.length) return null;
  const pick = date && days.some((d) => d.as_of === date) ? date : days[0].as_of;
  const [rezekii, built, lv] = await Promise.all([rezekiiCreators().catch(() => new Set<string>()), rankings().catch(() => null), levelMap().catch(() => new Map<string, number>())]);
  const avatars: Record<string, string | null> = {};
  for (const [u, d] of Object.entries(built?.details ?? {})) avatars[u.toLowerCase()] = (d as { a?: string | null }).a ?? null;
  const board = buildBoard(days, pick, rezekii, avatars);
  if (!board) return null;
  for (const r of [...board.rows, ...board.hall]) r.lv = lv.get(r.user.toLowerCase()) ?? null;
  return { ...board, period };
}
