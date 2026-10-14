/** Top creators (TikTok's 30-day affiliate top 100 joined with the Creator Marketplace) and Top sellers (shop accounts). */
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { gmvRange, inBoth } from "./daily.ts";
import { levelMap } from "./levels-map.ts";
import { rankings } from "./store.ts";

type Item = { rank?: number; user_name?: string; nick_name?: string; followers_count?: number; likes_count?: number; gmv_range?: string };
export type Period = "1D" | "7D" | "30D";
export type AccountType = "AFFILIATE" | "OFFICIAL" | "CHANNEL";

const lists = new Map<string, { at: number; day: string | null; items: Item[] }>();

/** TikTok's newest list for a period and account type: RM figures as TikTok gives them, creators in both its RM and US$ lists. */
export async function periodList(period: Period, type: AccountType): Promise<{ day: string | null; items: Item[] }> {
  const key = `${period}|${type}`;
  const hit = lists.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit;
  const slots = [`${key}|LOCAL`, `${key}|USD`].map(encodeURIComponent).join(",");
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.creators&slot=in.(${slots})&select=as_of,slot,items&order=as_of.desc&limit=6`)).json()) as { as_of: string; slot: string; items: Item[] }[];
  const day = rows.find((r) => r.slot.endsWith("LOCAL") && Array.isArray(r.items) && r.items.length)?.as_of ?? null;
  const L = rows.find((r) => r.as_of === day && r.slot.endsWith("LOCAL"))?.items ?? [];
  const U = rows.find((r) => r.as_of === day && r.slot.endsWith("USD"))?.items ?? [];
  const out = { at: Date.now(), day, items: inBoth(L, U) };
  lists.set(key, out);
  return out;
}

/** TikTok's Creator Marketplace GMV bands, as TikTok writes them, plus TikTok's own top 100. */
export const BANDS = ["top", "10k", "1k", "100", "0"] as const;
export type Band = (typeof BANDS)[number];
const BAND_OF: Record<string, Band> = { "RM10K+": "10k", "RM1K-RM10K": "1k", "RM100-RM1K": "100", "RM0-RM100": "0" };

/**
 * One creator on Top creators. `gmv`: TikTok's figure as TikTok shows it (its RM range, its band, or the exact figure the creator
 * shares, converted from US$ at TikTok's rate); never an estimate. `rank`: place in TikTok's 30-day affiliate top 100.
 */
export type TopRow = { user: string; nick: string; fol: number; avatar: string | null; gmv: string; exact: boolean; value: number; rank: number | null; lv: number | null; wa: boolean; em: boolean };
export type TopQuery = { band?: string; sort?: string; dir?: string; gmv?: string; wa?: boolean; em?: boolean; q?: string; pg?: number };
export type TopResult = { hero: TopRow[]; counts: Record<Band, number>; total: number; rows: TopRow[]; asOf: string | null; sort: string; dir: string };

const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));
const rmx = (v: number) => `RM${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(Math.round(v))}`;

let joined: { at: number; asOf: string | null; byBand: Record<Band, TopRow[]> } | null = null;

/** Every Top creators row by band, kept 10 minutes. */
async function topRows() {
  if (joined && Date.now() - joined.at < 10 * 60_000) return joined;
  const [list, b, lv] = await Promise.all([periodList("30D", "AFFILIATE"), rankings("find"), levelMap().catch(() => new Map<string, number>())]);
  const det = b?.details ?? {};
  const avatarOf = new Map((b?.find ?? []).map((f) => [f[0].slice(1).toLowerCase(), f[7]]));
  const info = (user: string) => {
    const d = det[user];
    return { avatar: d?.a ?? avatarOf.get(user.toLowerCase()) ?? null, x: d?.x ?? 0, wa: !!d?.wa, em: !!d?.em, lv: lv.get(user.toLowerCase()) ?? null };
  };
  const byBand = Object.fromEntries(BANDS.map((k) => [k, [] as TopRow[]])) as Record<Band, TopRow[]>;
  for (const it of list.items) {
    const user = it.user_name ?? "";
    if (!user) continue;
    const [lo, hi] = gmvRange(it.gmv_range);
    const i = info(user);
    byBand.top.push({ user, nick: it.nick_name ?? user, fol: it.followers_count ?? 0, avatar: i.avatar, gmv: i.x ? rmx(i.x) : lo || hi ? `RM${big(lo)} – ${big(hi)}` : "–", exact: !!i.x, value: i.x || hi, rank: it.rank ?? null, lv: i.lv, wa: i.wa, em: i.em });
  }
  for (const f of b?.find ?? []) {
    const band = BAND_OF[f[3]];
    if (!band) continue;
    const user = f[0].slice(1);
    const i = info(user);
    byBand[band].push({ user, nick: f[1], fol: f[2], avatar: i.avatar, gmv: i.x ? rmx(i.x) : f[3], exact: !!i.x, value: i.x, rank: null, lv: i.lv, wa: i.wa, em: i.em });
  }
  joined = { at: Date.now(), asOf: list.day, byBand };
  return joined;
}

/**
 * Top creators, last 30 days, affiliates only (owner, 14 Oct 2026): TikTok's affiliate top 100 and the Creator Marketplace in
 * TikTok's GMV bands. Sort by GMV (TikTok's order in the top 100; exact figures, then followers, in a band), exact figures
 * first, or followers. 24 rows, then 48 more a page.
 */
export async function topCreators(q: TopQuery): Promise<TopResult> {
  const all = await topRows();
  const band: Band = (BANDS as readonly string[]).includes(q.band ?? "") ? (q.band as Band) : "top";
  const sort = ["gmv", "exact", "fol"].includes(q.sort ?? "") ? q.sort! : "gmv";
  const dir = q.dir === "a" ? "a" : "d";
  const t = (q.q ?? "").trim().toLowerCase().replace(/^@/, "");
  const list = all.byBand[band].filter((r) => (!t || r.user.toLowerCase().includes(t) || r.nick.toLowerCase().includes(t)) && (q.gmv !== "exact" || r.exact) && (q.gmv !== "range" || !r.exact) && (!q.wa || r.wa) && (!q.em || r.em));
  const gmvKey = (r: TopRow) => (band === "top" ? -(r.rank ?? 999) : r.value);
  const key = sort === "fol" ? (r: TopRow) => r.fol : sort === "exact" ? (r: TopRow) => (r.exact ? 1e12 + r.value : band === "top" ? -(r.rank ?? 999) : r.fol) : gmvKey;
  const sign = dir === "d" ? -1 : 1;
  const sorted = [...list].sort((a, b) => sign * (key(a) - key(b)) || b.fol - a.fol);
  const n = 24 + (Math.max(1, Math.min(200, q.pg ?? 1)) - 1) * 48;
  return {
    hero: all.byBand.top.slice(0, 3),
    counts: Object.fromEntries(BANDS.map((k) => [k, all.byBand[k].length])) as Record<Band, number>,
    total: sorted.length, rows: sorted.slice(0, n), asOf: all.asOf, sort, dir,
  };
}

/** A shop account on Top sellers: a brand's official account or one of its channel accounts. */
export type SellerRow = { rank: number; user: string; nick: string; fol: number; likes: number; lo: number; hi: number; kind: "official" | "channel"; avatar: string | null };

/** Top sellers (owner, 14 Oct 2026): TikTok's lists of shop accounts for 1, 7 or 30 days, ranked by GMV, or by followers. */
export async function topSellers(q: { period?: string; kind?: string; sort?: string; dir?: string }) {
  const period: Period = q.period === "1D" || q.period === "7D" ? q.period : "30D";
  const [off, ch, b] = await Promise.all([periodList(period, "OFFICIAL"), periodList(period, "CHANNEL"), rankings().catch(() => null)]);
  const det = b?.details ?? {};
  const row = (it: Item, kind: SellerRow["kind"]): SellerRow => {
    const [lo, hi] = gmvRange(it.gmv_range);
    const user = it.user_name ?? "";
    return { rank: 0, user, nick: it.nick_name ?? user, fol: it.followers_count ?? 0, likes: it.likes_count ?? 0, lo, hi, kind, avatar: det[user]?.a ?? null };
  };
  const all = [...off.items.map((it) => row(it, "official")), ...ch.items.map((it) => row(it, "channel"))].filter((r) => r.user).sort((a, b) => b.lo + b.hi - (a.lo + a.hi));
  all.forEach((r, i) => (r.rank = i + 1));
  const list = q.kind === "official" || q.kind === "channel" ? all.filter((r) => r.kind === q.kind) : all;
  const sort = q.sort === "fol" ? "fol" : "gmv";
  const sign = q.dir === "a" ? 1 : -1;
  const rows = [...list].sort((a, b) => sign * (sort === "fol" ? a.fol - b.fol : b.rank - a.rank));
  return { rows, total: rows.length, counts: { all: all.length, official: off.items.length, channel: ch.items.length }, period, asOf: off.day ?? ch.day, sort, dir: sign === 1 ? "a" : "d" };
}
