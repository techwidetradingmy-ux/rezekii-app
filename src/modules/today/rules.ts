import type { TapProduct } from "../tap/catalog.ts";
import { unixSeconds } from "../tap/stages.ts";

/** [productId, why it is picked] */
export type TodayPick = [string, string];

const k = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(v));
const rate = (r: number | null) => `${((r ?? 0) / 100).toString()}%`;

/**
 * The creator's own categories from the TAP products they promote or asked samples for: the one with the most sales
 * (or, before any sales, the most products) is their top category.
 */
export function creatorCategories(rows: { productId: string; paid: number }[], categoryOf: Map<string, string | null>): { top: string | null; niche: Set<string> } {
  const paid = new Map<string, number>(), count = new Map<string, number>();
  for (const r of rows) {
    const c = categoryOf.get(r.productId);
    if (!c) continue;
    paid.set(c, (paid.get(c) ?? 0) + r.paid);
    count.set(c, (count.get(c) ?? 0) + 1);
  }
  const top = [...count.keys()].sort((a, b) => (paid.get(b) ?? 0) - (paid.get(a) ?? 0) || (count.get(b) ?? 0) - (count.get(a) ?? 0) || a.localeCompare(b))[0] ?? null;
  return { top, niche: new Set(count.keys()) };
}

/**
 * "Recommended for you", scored as in the mockup: top category +3, own category +2, free sample +1, then units sold today,
 * then the Silver rate. At most 2 per category and 6 in all. Products the creator already promotes are left out; when their
 * own categories run short, the rest comes from what is selling now.
 */
export function pickForYou(all: TapProduct[], top: string | null, niche: Set<string>, promoted: Set<string>): TodayPick[] {
  const score = (p: TapProduct) => ((p.category === top ? 3 : 0) + (niche.has(p.category ?? "") ? 2 : 0) + (p.samples > 0 ? 1 : 0)) * 1e9 + p.soldToday * 1e3 + (p.silverRate ?? 0);
  const picks: TodayPick[] = [];
  const perCat = new Map<string, number>();
  const taken = new Set<string>();
  const add = (pool: TapProduct[], own: boolean) => {
    for (const p of [...pool].sort((a, b) => score(b) - score(a) || b.sold - a.sold)) {
      if (picks.length === 6) return;
      const cat = p.category ?? "";
      if (taken.has(p.id) || promoted.has(p.id) || (perCat.get(cat) ?? 0) >= 2) continue;
      perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
      taken.add(p.id);
      const label = own ? (cat === top ? "Your top category" : "Your niche") : "Selling now";
      picks.push([p.id, `${label} · ${p.soldToday ? `+${k(p.soldToday)} sold today` : p.samples > 0 ? "free sample" : `Silver ${rate(p.silverRate)}`}`]);
    }
  };
  if (niche.size) add(all.filter((p) => niche.has(p.category ?? "")), true);
  add(all, false);
  return picks;
}

export type ClosingSoon = { campaigns: number; products: number; upto: number; first: string; end: number };

/** TAP campaigns that close in the next 30 days (by each product's campaign end), for the countdown banner. Null when none. */
export function closingSoon(all: TapProduct[], nowSec: number): ClosingSoon | null {
  const soon = all.map((p) => ({ p, end: unixSeconds(p.campaignEnd) })).filter((x) => x.end > nowSec && x.end < nowSec + 30 * 86400);
  if (!soon.length) return null;
  const ends = new Map<string, number>();
  for (const { p, end } of soon) {
    const name = p.campaignName ?? "";
    ends.set(name, Math.min(ends.get(name) ?? Infinity, end));
  }
  const [first, end] = [...ends.entries()].sort((a, b) => a[1] - b[1])[0];
  return { campaigns: ends.size, products: soon.length, upto: Math.max(...soon.map((x) => x.p.silverRate ?? 0)) / 100, first, end };
}

/** "Best-selling TAP products": 0 = most units since yesterday, 1 = highest Silver commission. Top 6 ids. */
export function bestSelling(all: TapProduct[], sort: 0 | 1): string[] {
  const key = (p: TapProduct) => (sort === 0 ? p.soldToday : (p.silverRate ?? 0));
  return [...all].sort((a, b) => key(b) - key(a) || b.sold - a.sold).slice(0, 6).map((p) => p.id);
}

/** "+20%" against last week, or "" when last week had none. */
export function weekDelta(now: number, prev: number): string {
  if (!prev) return "";
  const d = Math.round(((now - prev) / prev) * 100);
  return `${d >= 0 ? "+" : ""}${d}%`;
}

const MYT = 8 * 3600_000;
/** "Good morning" etc. by Malaysia time. */
export function greeting(now: number): string {
  const h = new Date(now + MYT).getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "Saturday, 14 October" in Malaysia time. */
export function longDay(now: number): string {
  const part = (o: Intl.DateTimeFormatOptions) => new Date(now).toLocaleDateString("en-GB", { ...o, timeZone: "Asia/Kuala_Lumpur" });
  return `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })}`;
}

/** "Today · 8:00 pm", "Tomorrow · 12:00 pm", "Posted today · 6:00 am", "Sat 18 Oct · 8:00 pm". */
export function postWhen(at: number, now: number, posted: boolean): string {
  const day = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
  const time = new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" }).toLowerCase();
  const d = day(at);
  const rel = d === day(now) ? "today" : d === day(now + 86400_000) ? "tomorrow" : d === day(now - 86400_000) ? "yesterday" : "";
  const label = rel
    ? posted ? `Posted ${rel}` : rel[0].toUpperCase() + rel.slice(1)
    : `${posted ? "Posted " : ""}${new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }).replace(",", "")}`;
  return `${label} · ${time}`;
}
