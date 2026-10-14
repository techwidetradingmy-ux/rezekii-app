import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { rankings } from "./store.ts";

/** One creator on one day's TikTok top 100. GMV is TikTok's range in RM. `prev`: rank the day before (null: not in it). */
export type DailyRow = {
  rank: number; user: string; nick: string; followers: number; lo: number; hi: number; avatar: string | null;
  prev: number | null; days: number; history: (number | null)[]; rezekii: boolean;
};
export type HallRow = { user: string; nick: string; avatar: string | null; days: number; best: number; history: (number | null)[]; rezekii: boolean };
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

let cache: { at: number; days: Day[] } | null = null;

/** TikTok's saved daily top-100 creator lists (all creators, RM), kept 10 minutes. */
async function savedDays(): Promise<Day[]> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.days;
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.creators&slot=eq.${encodeURIComponent("1D|ALL|LOCAL")}&select=as_of,items&order=as_of.desc&limit=60`)).json()) as Day[];
  cache = { at: Date.now(), days: rows.filter((r) => Array.isArray(r.items) && r.items.length) };
  return cache.days;
}

/** Linked Rezekii creators' TikTok usernames, lower case. */
async function rezekiiCreators(): Promise<Set<string>> {
  const rows = (await (await supabaseRest("affiliate_connections?user_id=not.is.null&select=username&limit=2000")).json()) as { username?: string | null }[];
  return new Set(rows.map((r) => r.username).filter((x): x is string => !!x).map((x) => x.toLowerCase()));
}

/** The Daily Top 100 Creators board for `date` (the newest saved day when not given or not saved). */
export async function dailyTop100(date?: string): Promise<DailyBoard | null> {
  const days = await savedDays();
  if (!days.length) return null;
  const pick = date && days.some((d) => d.as_of === date) ? date : days[0].as_of;
  const [rezekii, built] = await Promise.all([rezekiiCreators().catch(() => new Set<string>()), rankings().catch(() => null)]);
  const avatars: Record<string, string | null> = {};
  for (const [u, d] of Object.entries(built?.details ?? {})) avatars[u.toLowerCase()] = (d as { a?: string | null }).a ?? null;
  return buildBoard(days, pick, rezekii, avatars);
}
