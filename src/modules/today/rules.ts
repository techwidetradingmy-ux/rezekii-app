import type { TapProduct } from "../tap/catalog.ts";
import { unixSeconds } from "../tap/stages.ts";

/**
 * Malaysia's selling seasons (owner, 15 Oct 2026): products for a season are pushed from 6 weeks before it until a few days
 * after. Islamic dates are the expected dates. A product belongs to a season when its name has one of the season's words.
 */
export type Season = { name: string; days: string[]; after: number; words: RegExp };
export const SEASONS: Season[] = [
  { name: "Ramadan", days: ["2027-02-08", "2028-01-28"], after: 28, words: /\b(ramadan|ramadhan|puasa|iftar|sahur|kurma|tamar|telekung|sejadah|al-?quran|tasbih)\b/i },
  { name: "Raya", days: ["2027-03-10", "2028-02-27"], after: 14, words: /\b(raya|lebaran|aidilfitri|kurung|kebaya|baju melayu|songkok|sampin|samping|telekung|sejadah|kurma|kuih|ketupat|langsir|duit raya|sampul|pelita|jubah|abaya|kopiah|pelikat)\b/i },
  { name: "Chinese New Year", days: ["2027-02-06", "2028-01-26"], after: 7, words: /\b(chinese new year|cny|lunar new year|ang ?pao|ang ?pow|red packet|mandarin orange|lantern|tanglung|cheongsam|bak ?kwa)\b/i },
  { name: "Deepavali", days: ["2026-11-08", "2027-10-29", "2028-10-17"], after: 3, words: /\b(deepavali|diwali|saree|sari|kurta|lehenga|kolam|diya|murukku)\b/i },
  { name: "Christmas", days: ["2026-12-25", "2027-12-25", "2028-12-25"], after: 1, words: /\b(christmas|xmas|santa|reindeer|snowman|advent|ornament|hamper)\b/i },
  { name: "Back to school", days: ["2027-01-11", "2028-01-10"], after: 14, words: /\b(school|sekolah|stationery|alat tulis|pencil case|kotak pensel|backpack|uniform|lunch ?box|bekas makanan|water bottle|botol air)\b/i },
  { name: "Hari Raya Haji", days: ["2027-05-17", "2028-05-05"], after: 3, words: /\b(aidiladha|raya haji|korban|qurban)\b/i },
  { name: "Merdeka", days: ["2027-08-31", "2028-08-31"], after: 16, words: /\b(merdeka|jalur gemilang|bendera)\b/i },
];
const LEAD_DAYS = 42;

/** The seasons whose window (6 weeks before until a few days after) includes `now`. */
export function activeSeasons(now: number, seasons = SEASONS): Season[] {
  return seasons.filter((x) => x.days.some((d) => { const t = Date.parse(`${d}T00:00:00+08:00`); return now >= t - LEAD_DAYS * 86400_000 && now < t + (x.after + 1) * 86400_000; }));
}

/**
 * The creator's categories with the most sales in the last 30 days, all shops (owner, 15 Oct 2026: recommend from what sells
 * best for them this month). `products` are their top products by GMV; `categoryOf` gives each product's category.
 */
export function bestCategories(products: { productId: string; gmv: number }[], categoryOf: (id: string) => string | null | undefined, n = 3): Set<string> {
  const gmv = new Map<string, number>();
  for (const p of products) {
    const c = categoryOf(p.productId);
    if (c) gmv.set(c, (gmv.get(c) ?? 0) + p.gmv);
  }
  return new Set([...gmv.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c));
}

/**
 * The creator's own categories from the TAP products they promote or asked samples for: the one with the most sales
 * (or, before any sales, the most products) is their top category, and their niche is their 5 biggest categories.
 */
export function creatorCategories(rows: { productId: string; paid: number }[], categoryOf: Map<string, string | null>): { top: string | null; niche: Set<string> } {
  const paid = new Map<string, number>(), count = new Map<string, number>();
  for (const r of rows) {
    const c = categoryOf.get(r.productId);
    if (!c) continue;
    paid.set(c, (paid.get(c) ?? 0) + r.paid);
    count.set(c, (count.get(c) ?? 0) + 1);
  }
  const ranked = [...count.keys()].sort((a, b) => (paid.get(b) ?? 0) - (paid.get(a) ?? 0) || (count.get(b) ?? 0) - (count.get(a) ?? 0) || a.localeCompare(b));
  return { top: ranked[0] ?? null, niche: new Set(ranked.slice(0, 5)) };
}

/** What "Recommended for you" goes on: the creator's niche, their best sellers this month, and the seasons coming up. */
export type Signals = { top: string | null; niche: Set<string>; best: Set<string>; seasons: Season[] };

/**
 * "Recommended for you": TAP Marketplace products that best match the creator (owner, 15 Oct 2026). A product scores for being
 * in their top category (+3), any of their categories (+2), a category of their best sellers this month (+3), a season coming up
 * (+3) and a free sample (+1); then units sold since yesterday, then the Silver rate. At most 2 per category, 3 seasonal ones
 * outside their categories, 6 in all; products they already promote are left out; the rest is filled with what is selling now.
 */
export function pickForYou(all: TapProduct[], s: Signals, promoted: Set<string>): string[] {
  const inSeason = (p: TapProduct) => s.seasons.some((x) => x.words.test(p.name));
  const own = (p: TapProduct) => s.niche.has(p.category ?? "") || s.best.has(p.category ?? "");
  const fit = (p: TapProduct) => (p.category === s.top ? 3 : 0) + (s.niche.has(p.category ?? "") ? 2 : 0) + (s.best.has(p.category ?? "") ? 3 : 0) + (inSeason(p) ? 3 : 0) + (p.samples > 0 ? 1 : 0);
  const score = (p: TapProduct) => fit(p) * 1e9 + p.soldToday * 1e3 + (p.silverRate ?? 0);
  const picks: string[] = [];
  const perCat = new Map<string, number>();
  let seasonal = 0;
  for (const p of [...all].sort((a, b) => score(b) - score(a) || b.sold - a.sold)) {
    if (picks.length === 6) break;
    const cat = p.category ?? "";
    if (promoted.has(p.id) || (perCat.get(cat) ?? 0) >= 2) continue;
    const extra = inSeason(p) && !own(p);
    if (extra && seasonal >= 3) continue;
    if (extra) seasonal++;
    perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
    picks.push(p.id);
  }
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
