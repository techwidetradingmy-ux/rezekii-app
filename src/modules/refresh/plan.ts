/** What the daily refresh fetches, as a list of tasks. Pure: no network, no database. */

export type TaskKind = "tap_campaigns" | "tap_products" | "tap_catalog" | "tap_samples" | "tap_samples_mine" | "tap_creators" | "levels" | "rankings" | "videos" | "orders" | "best" | "details" | "photos" | "marketplace" | "agency" | "community" | "sold" | "ideas";
export type PlannedTask = { key: string; kind: TaskKind; params: Record<string, unknown>; priority: number };

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;

/** The Malaysian calendar day (YYYY-MM-DD) `n` days before `now`. */
export const mytDay = (now: number, n = 0) => new Date(now + MYT - n * DAY).toISOString().slice(0, 10);
/** Malaysia's hour of the day, 0-23. */
export const mytHour = (now: number) => new Date(now + MYT).getUTCHours();

/**
 * The usual Creator Marketplace search runs once a week, on Mondays (owner, 23 Oct 2026: every creator is in already, and the
 * daily search was most of Rezekii's server use). The level-split search still runs on the 1st.
 */
export const MARKET_WEEKDAY = 1;
/** Malaysia's day of the week, 0 = Sunday. */
export const mytWeekday = (now: number) => new Date(now + MYT).getUTCDay();

/** Tasks are planned right after midnight (Malaysia time), so the new day starts with fresh data (owner, 14 Oct 2026). */
export const PLAN_HOUR = 0;
export const DATA_LAG_DAYS = 2;
/**
 * TikTok publishes yesterday's lists later in the day (by 17:00 on 14 Oct 2026). Once the day is planned, Rezekii checks for
 * them every 15 minutes, so the newest lists arrive within 15 minutes of TikTok publishing them (owner: always the latest).
 */
export const LATE_HOUR = PLAN_HOUR;
/**
 * Missing days of the daily product lists are filled in for this many days back (owner, 2 Nov 2026: AI Picks' Rising reads 14
 * days; the first run fills all of them).
 */
export const DAILY_DAYS = 14;

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

/** TikTok's creator levels in Malaysia (from Get Seller Search Creator Marketplace Advanced Filters, 14 Oct 2026). */
export const TT_LEVELS = ["Lv. 0", "Lv. 1", "Lv. 2", "Lv. 3", "Lv. 4", "Lv. 5", "Lv. 6", "Lv. 7", "Lv. 8"];

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
/**
 * Paused (owner, 31 Oct 2026): the Rankings build and the Creator Marketplace search aren't shown in the new app. The best-seller
 * lists keep coming, as soon as TikTok publishes them, for admins.
 */
export const RANKINGS = false;
export const CREATOR_SEARCH = false;

/**
 * The best-seller lists creators' screens use, read every day (owner, 2 Nov 2026: calls only for data that matters): products by
 * category for 1 and 30 days (Today's Ideas, AI Picks, product trends) and videos for 1 day, all in RM. Admins' other lists are
 * read when an admin opens them; the rest only feed Rankings, read when an admin refreshes it.
 */
export const dailyList = (kind: string, timeSlot: string, currency: string) =>
  currency === "LOCAL" && (kind === "products" ? timeSlot !== "7D" : kind === "videos" && timeSlot === "1D");

/**
 * One data date as the newest: the daily best-seller lists (`all`: every list, for a Rankings build), then the Rankings page
 * data built from them.
 */
export function planNewest(date: string, all = RANKINGS): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  const want = (kind: string, timeSlot: string, currency: string) => all || dailyList(kind, timeSlot, currency);
  for (const timeSlot of SLOTS)
    for (const currency of CURRENCIES) {
      // Admin-only (owner, 31 Oct 2026): after everything people see, so the 1:00 AM data is ready first.
      if (want("creators", timeSlot, currency)) for (const authorType of AUTHOR_TYPES) tasks.push(best("creators", date, timeSlot, currency, { authorType }, 7));
      if (want("products", timeSlot, currency)) for (const categoryId of CATEGORIES) tasks.push(best("products", date, timeSlot, currency, { categoryId }, 7));
      if (want("videos", timeSlot, currency)) tasks.push(best("videos", date, timeSlot, currency, {}, 7));
      if (want("lives", timeSlot, currency)) tasks.push(best("lives", date, timeSlot, currency, {}, 7));
    }
  // the Rankings page data, once every best-seller list is saved
  if (RANKINGS) tasks.push({ key: `rankings|${date}`, kind: "rankings", params: { day: date }, priority: 5 });
  return tasks;
}

/**
 * `newestBuilt`: Rankings were already built for the day-2 date (yesterday's late check did it), so it isn't fetched again.
 * `levelPassOpen`: the month's level-split marketplace search is still running, so the usual one waits for it.
 */
export function planDay(now: number, haveDays: Set<string>, newestBuilt = false, levelPassOpen = false): PlannedTask[] {
  const newest = mytDay(now, DATA_LAG_DAYS);
  const tasks: PlannedTask[] = [
    { key: "tap_campaigns", kind: "tap_campaigns", params: {}, priority: 1 },
    // the TAP Marketplace table, rebuilt once every campaign's products are in
    { key: "tap_catalog", kind: "tap_catalog", params: {}, priority: 3 },
    // which TAP products TikTok really offers free samples of, once the catalog is rebuilt (each creator's own check runs when
    // she opens the Marketplace, owner 2 Nov 2026)
    { key: "tap_samples", kind: "tap_samples", params: {}, priority: 3 },
    // creator levels, once every campaign's creators are read (tap_creators)
    { key: "levels", kind: "levels", params: {}, priority: 5 },
    // the daily Facebook, Instagram and Threads numbers for Channel Numbers (back on, owner 21 Nov 2026)
    { key: "community", kind: "community", params: {}, priority: 6 },
    // video numbers for every connected TikTok account in use (admin Video stats)
    { key: "videos", kind: "videos", params: {}, priority: 6 },
    // every linked creator's own affiliate orders (Sales page, admin Stats, Rankings by real GMV)
    { key: "orders", kind: "orders", params: {}, priority: 6 },
  ];

  if (!newestBuilt) tasks.push(...planNewest(newest));

  // Older days: only the daily (1D) product lists in RM, and only days not saved yet.
  for (let n = DATA_LAG_DAYS + 1; n < DATA_LAG_DAYS + DAILY_DAYS; n++) {
    const date = mytDay(now, n);
    if (haveDays.has(date)) continue;
    for (const categoryId of CATEGORIES) tasks.push(best("products", date, "1D", "LOCAL", { categoryId }, 8));
  }

  // Rezekii creators' own profiles (their audience in AI Picks)
  tasks.push({ key: "details", kind: "details", params: {}, priority: 5 });
  // saved copies of Rezekii creators' and connected accounts' photos, each refreshed every two weeks (TikTok's photo addresses
  // expire in a day or two)
  tasks.push({ key: "photos", kind: "photos", params: {}, priority: 5 });
  // each Rezekii product's and each creator's showcase products' all-time units sold, for Today's Ideas' daily sales
  tasks.push({ key: "sold", kind: "sold", params: {}, priority: 5 });
  // linked creators' TikTok level (from the 1st, monthly): queues one task per creator who is due. Each creator's Today's Ideas
  // are made once TikTok publishes the day's lists (runner.ts).
  tasks.push({ key: "agency", kind: "agency", params: {}, priority: 6 });
  // On the 1st the marketplace search is also split by TikTok's creator level, so each creator's level comes with it (levels
  // change monthly). It takes more than a day, so it carries on past midnight and the usual search waits for it. The usual
  // search runs on Mondays.
  if (!CREATOR_SEARCH) return tasks;
  if (mytDay(now).endsWith("-01")) {
    for (const [i, level] of TT_LEVELS.entries())
      for (const [min, max] of FOLLOWER_BANDS)
        tasks.push({ key: `marketplace|lv${i}|${min}-${max ?? "up"}`, kind: "marketplace", params: { min, max, level }, priority: 6 });
  } else if (!levelPassOpen && mytWeekday(now) === MARKET_WEEKDAY) {
    tasks.push(...creatorSearchTasks());
  }
  return tasks;
}

/**
 * The Creator Marketplace search, one task per follower band. `run` makes the keys new, for a search an admin starts by hand
 * (owner, 31 Oct 2026: paused, run only when an admin presses Refresh).
 */
export function creatorSearchTasks(run = ""): PlannedTask[] {
  return FOLLOWER_BANDS.map(([min, max]) => ({ key: `marketplace|${min}-${max ?? "up"}${run}`, kind: "marketplace" as const, params: { min, max }, priority: 6 }));
}
