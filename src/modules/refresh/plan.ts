/** What the daily refresh fetches, as a list of tasks. Pure: no network, no database. */

export type TaskKind = "tap_campaigns" | "tap_products" | "tap_catalog" | "tap_creators" | "levels" | "rankings" | "videos" | "orders" | "best" | "details" | "marketplace";
export type PlannedTask = { key: string; kind: TaskKind; params: Record<string, unknown>; priority: number };

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;

/** The Malaysian calendar day (YYYY-MM-DD) `n` days before `now`. */
export const mytDay = (now: number, n = 0) => new Date(now + MYT - n * DAY).toISOString().slice(0, 10);
/** Malaysia's hour of the day, 0-23. */
export const mytHour = (now: number) => new Date(now + MYT).getUTCHours();

/** Tasks are planned from this hour (Malaysia time). TikTok's best-seller data runs two days behind. */
export const PLAN_HOUR = 6;
export const DATA_LAG_DAYS = 2;
/** Daily lists are kept for this many days; missing days are filled in (the first run fills all of them). */
export const DAILY_DAYS = 30;

const SLOTS = ["1D", "7D", "30D"] as const;
const CURRENCIES = ["LOCAL", "USD"] as const;
export const AUTHOR_TYPES = ["ALL", "AFFILIATE", "OFFICIAL", "CHANNEL"] as const;
/** TikTok Shop Malaysia's 28 level-1 product categories (from Get Categories). "" = every category. */
export const CATEGORIES = [
  "", "600001", "600024", "600154", "600942", "601152", "601303", "601352", "601450", "601739", "601755", "602118", "602284", "603014",
  "604206", "604453", "604579", "604968", "605196", "605248", "700437", "700645", "802184", "824328", "824584", "951432", "953224", "856720", "801928",
];
/**
 * Creator Marketplace search stops at about 1,000 results per search, so the nightly pass runs one search per
 * follower band. Bands are narrower where creators are more common.
 */
export const FOLLOWER_BANDS: [number, number | null][] = [
  [0, 999], [1000, 1999], [2000, 4999], [5000, 9999], [10000, 19999], [20000, 49999],
  [50000, 99999], [100000, 199999], [200000, 499999], [500000, 999999], [1000000, null],
];

/** Snapshot slot for a best-seller list, e.g. "30D|AFFILIATE|LOCAL" or "1D|600001|USD" ("ALL" = every category). */
export function bestSlot(p: { kind: string; timeSlot: string; currency: string; authorType?: string; categoryId?: string }): string {
  const who = p.kind === "creators" ? p.authorType : p.kind === "products" ? p.categoryId || "ALL" : undefined;
  return [p.timeSlot, who, p.currency].filter(Boolean).join("|");
}

function best(kind: string, date: string, timeSlot: string, currency: string, extra: { authorType?: string; categoryId?: string }, priority: number): PlannedTask {
  const params = { kind, date, timeSlot, currency, ...extra };
  return { key: `best|${kind}|${date}|${bestSlot(params)}`, kind: "best", params, priority };
}

/**
 * The whole day's work. `haveDays` holds the data dates whose daily lists are already saved, so only missing days are fetched.
 * Order (priority): TAP campaigns, the newest lists, older missing days, then creator profiles. The marketplace pass runs alongside.
 */
export function planDay(now: number, haveDays: Set<string>): PlannedTask[] {
  const newest = mytDay(now, DATA_LAG_DAYS);
  const tasks: PlannedTask[] = [
    { key: "tap_campaigns", kind: "tap_campaigns", params: {}, priority: 1 },
    // the TAP Marketplace table, rebuilt once every campaign's products are in
    { key: "tap_catalog", kind: "tap_catalog", params: {}, priority: 3 },
    // creator levels, once every campaign's creators are read (tap_creators)
    { key: "levels", kind: "levels", params: {}, priority: 5 },
    // the Rankings page data, once every best-seller list is saved
    { key: "rankings", kind: "rankings", params: { day: newest }, priority: 5 },
    // video numbers for every connected TikTok account (admin Video stats)
    { key: "videos", kind: "videos", params: {}, priority: 6 },
    // every linked creator's own affiliate orders (Sales page, admin Stats, Rankings by real GMV)
    { key: "orders", kind: "orders", params: {}, priority: 6 },
  ];

  // Newest date: every period for every list.
  for (const timeSlot of SLOTS)
    for (const currency of CURRENCIES) {
      for (const authorType of AUTHOR_TYPES) tasks.push(best("creators", newest, timeSlot, currency, { authorType }, 3));
      for (const categoryId of CATEGORIES) tasks.push(best("products", newest, timeSlot, currency, { categoryId }, 3));
      tasks.push(best("videos", newest, timeSlot, currency, {}, 3));
      tasks.push(best("lives", newest, timeSlot, currency, {}, 3));
    }

  // Older days: only the daily (1D) creator and product lists, and only days not saved yet.
  for (let n = DATA_LAG_DAYS + 1; n < DATA_LAG_DAYS + DAILY_DAYS; n++) {
    const date = mytDay(now, n);
    if (haveDays.has(date)) continue;
    for (const currency of CURRENCIES) {
      for (const authorType of AUTHOR_TYPES) tasks.push(best("creators", date, "1D", currency, { authorType }, 4));
      for (const categoryId of CATEGORIES) tasks.push(best("products", date, "1D", currency, { categoryId }, 4));
    }
  }

  tasks.push({ key: "details", kind: "details", params: {}, priority: 5 });
  for (const [min, max] of FOLLOWER_BANDS)
    tasks.push({ key: `marketplace|${min}-${max ?? "up"}`, kind: "marketplace", params: { min, max }, priority: 6 });
  return tasks;
}
