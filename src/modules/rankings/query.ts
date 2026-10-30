/** Rankings queries over the built data: the mockup's filters, sorts and pages, done on the server. Pure. */
import { CAT, SLOTS, type CreatorRow, type Detail, type FindRow, type LiveRow, type ProductMeta, type ProductRow, type Slot, type VideoRow } from "./build.ts";
import type { Built } from "./store.ts";

export const PAGE_FIRST = 20;
export const PAGE_MORE = 50;
export const SORTS: [string, string][][] = [
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["fol-d", "Followers: high to low"], ["fol-a", "Followers: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["rat-d", "Rating: high to low"], ["rat-a", "Rating: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["vw-d", "Views: high to low"], ["vw-a", "Views: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["len-d", "Length: longest first"], ["len-a", "Length: shortest first"]],
];

export type ListQuery = { view: number; slot: number; cat?: string; ctype?: number; wa?: boolean; em?: boolean; x?: boolean; sort?: string; pg?: number };

/** A creator row for the page: the list row plus the bits of their profile and best video the row shows. */
export type CreatorItem = { row: CreatorRow; det: Pick<Detail, "a" | "c" | "vs" | "wa" | "em" | "x"> | null; vid: { id: string; views: number; posted: string; lo: number; hi: number; peak: number } | null };
export type ListResult = {
  view: number; slot: Slot; total: number; shown: number; sort: string; sortLabel: string;
  creators?: CreatorItem[]; products?: { row: ProductRow; meta: ProductMeta }[]; videos?: VideoRow[]; lives?: LiveRow[];
  cats: [string, number][]; ctypes: [number, number, number]; more: { wa: number; em: number; x: number };
  conv: number; dropped: number; tier1: number; rate30: number; asOf: string;
};

/** Video share of a creator's GMV (from their profile); -1 when unknown. "Video" creators = 50% or more. */
const vsOf = (b: Built, user: string) => b.details[user]?.vs ?? -1;
const TYPES = [() => true, (b: Built, u: string) => vsOf(b, u) >= 50, (b: Built, u: string) => vsOf(b, u) >= 0 && vsOf(b, u) < 50];

export function listRankings(b: Built, q: ListQuery): ListResult {
  const view = Math.max(0, Math.min(3, q.view | 0));
  const slot = SLOTS[Math.max(0, Math.min(2, q.slot | 0))];
  const sorts = SORTS[view];
  const sort = sorts.some(([v]) => v === q.sort) ? q.sort! : "gmv-d";
  const [field, dir] = sort.split("-");
  const pg = Math.max(1, Math.min(200, q.pg ?? 1));
  const shownMax = PAGE_FIRST + (pg - 1) * PAGE_MORE;
  const has = (k: "wa" | "em" | "x") => (u: string) => !!b.details[u]?.[k];
  const order = <T>(list: T[], key: (t: T) => number, rank: (t: T) => number) => {
    const sign = (field === "gmv" ? -1 : 1) * (dir === "d" ? -1 : 1);
    return [...list].sort((a, c) => (field === "gmv" ? rank(a) - rank(c) : key(a) - key(c)) * sign || rank(a) - rank(c));
  };
  const name = (["creators", "products", "videos", "lives"] as const)[view];
  // The list's own day: earlier than asOf when TikTok hadn't published this list yet.
  const base = { view, slot, sort, sortLabel: sorts.find(([v]) => v === sort)![1], tier1: b.tier1[slot], rate30: b.rates.creators["30D"] ?? 4.08, asOf: b.listDays?.[name] ?? b.asOf };
  const dropped = b.dropped[name]?.[slot] ?? 0;

  if (view === 0) {
    const all = b.creators[slot];
    const catCount: Record<string, number> = {};
    for (const c of all) for (const k of b.details[c[1]]?.c ?? []) catCount[k] = (catCount[k] ?? 0) + 1;
    const list = all.filter((c) => (!q.cat || (b.details[c[1]]?.c ?? []).includes(q.cat)) && (!q.wa || has("wa")(c[1])) && (!q.em || has("em")(c[1])) && (!q.x || has("x")(c[1])) && TYPES[q.ctype ?? 0](b, c[1]));
    const sorted = order(list, (c) => c[3], (c) => c[0]).slice(0, shownMax);
    return {
      ...base, total: list.length, shown: sorted.length, dropped, conv: list.filter((c) => c[7]).length,
      cats: Object.entries(catCount).sort((a, c) => c[1] - a[1]),
      ctypes: [all.length, all.filter((c) => TYPES[1](b, c[1])).length, all.filter((c) => TYPES[2](b, c[1])).length],
      more: { wa: all.filter((c) => has("wa")(c[1])).length, em: all.filter((c) => has("em")(c[1])).length, x: all.filter((c) => has("x")(c[1])).length },
      creators: sorted.map((row) => {
        const d = b.details[row[1]];
        const id = b.cbest[row[1]];
        const v = id ? b.vid[id] : null;
        return {
          row, det: d ? { a: d.a, c: d.c, vs: d.vs, wa: d.wa, em: d.em, x: slot === "30D" ? d.x : 0 } : null,
          vid: v && id ? { id, views: v[0], posted: v[4], lo: v[8], hi: v[9], peak: Math.max(0, ...v[11].map((s) => s[2])) } : null,
        };
      }),
    };
  }
  const empty = { ctypes: [0, 0, 0] as [number, number, number], more: { wa: 0, em: 0, x: 0 } };
  if (view === 1) {
    const all = b.products[slot];
    const catCount: Record<string, number> = {};
    for (const r of all) catCount[b.pm[r[0]][4]] = (catCount[b.pm[r[0]][4]] ?? 0) + 1;
    const list = q.cat ? all.filter((r) => b.pm[r[0]][4] === q.cat).sort((a, c) => a[4] - c[4]) : all;
    // With a category chosen, "GMV" keeps TikTok's order inside that category.
    const ranked = list.map((r, i) => ({ r, i }));
    const sorted = (q.cat && field === "gmv" ? (dir === "a" ? [...ranked].reverse() : ranked) : order(ranked, ({ r }) => b.pm[r[0]][3], ({ i }) => i)).slice(0, shownMax).map(({ r }) => ({ row: r, meta: b.pm[r[0]] }));
    return { ...base, ...empty, total: list.length, shown: sorted.length, dropped, conv: list.filter((r) => r[3]).length, cats: Object.entries(catCount).sort((a, c) => c[1] - a[1]), products: sorted };
  }
  if (view === 2) {
    const list = b.videos[slot];
    const sorted = order(list, (v) => v[4], (v) => v[0]).slice(0, shownMax);
    return { ...base, ...empty, total: list.length, shown: sorted.length, dropped, conv: list.filter((v) => v[12]).length, cats: [], videos: sorted };
  }
  const list = b.lives[slot];
  const sorted = order(list, (l) => l[4], (l) => l[0]).slice(0, shownMax);
  return { ...base, ...empty, total: list.length, shown: sorted.length, dropped, conv: list.filter((l) => l[9]).length, cats: [], lives: sorted };
}

/** Everything the creator panel shows. */
export function creatorPanel(b: Built, user: string) {
  const row = SLOTS.map((s) => b.creators[s].find((c) => c[1] === user)).find(Boolean) ?? null;
  const id = b.cbest[user];
  return { user, row, det: b.details[user] ?? null, vid: id ? { id, v: b.vid[id] } : null, nDays: b.videoDays.n, first: b.videoDays.first, last: b.videoDays.last, rate30: b.rates.creators["30D"] ?? 4.08 };
}

/** What the video player shows: from TikTok's bestselling-video lists, or the creator's best video. */
export function videoInfo(b: Built, id: string) {
  const t = SLOTS.map((s) => b.videos[s].find((r) => r[1] === id)).find(Boolean);
  if (t) return { id, title: `Video by ${t[2]}`, seconds: t[3], stats: [t[4], t[5], t[6], t[7]], products: t[11], lo: t[8], hi: t[9], conv: !!t[12], posted: t[10] };
  const x = b.vid[id];
  if (!x) return null;
  const user = Object.keys(b.cbest).find((u) => b.cbest[u] === id) ?? "";
  return { id, title: `Video by @${user}`, seconds: x[6], stats: [x[0], x[1], x[2], x[3]], products: x[7], lo: x[8], hi: x[9], conv: false, posted: x[4] };
}

export const FIND_FILTERS: [string, (c: FindRow) => boolean][] = [
  ["10k+ followers", (c) => c[2] >= 10000],
  ["Mostly video", (c) => c[4] >= 70],
  ["Mostly LIVE", (c) => c[4] >= 0 && c[4] <= 30],
  ["Shares exact GMV", (c) => c[6]],
];

/** Creator Marketplace search: username or name, the 4 filters, by GMV or followers, 24 then 48 more per page. */
export function findCreators(b: Built, q: { text?: string; f?: boolean[]; sort?: string; pg?: number }) {
  const t = (q.text ?? "").trim().toLowerCase();
  const list = b.find.filter((c) => (!t || c[0].toLowerCase().includes(t) || c[1].toLowerCase().includes(t)) && FIND_FILTERS.every(([, fn], i) => !q.f?.[i] || fn(c)));
  const sorted = q.sort === "fol" ? [...list].sort((a, c) => c[2] - a[2]) : list;
  const n = 24 + (Math.max(1, q.pg ?? 1) - 1) * 48;
  return { total: list.length, rows: sorted.slice(0, n) };
}

export const catName = (id: string) => CAT[id] ?? id;
