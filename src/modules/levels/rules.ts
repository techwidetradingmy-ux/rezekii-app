/**
 * Creator levels (owner, 14 Oct 2026; Silver changed 1 Nov 2026):
 *   Bronze: when you join, always kept.
 *   Silver: either one in a calendar month: RM1,000 sales through Rezekii (Techwide's TAP campaigns), or 10 videos for Rezekii
 *           samples (one sample with 10 videos counts). She goes up as soon as she reaches it. To keep it, she reaches either
 *           one again every month: checked on the 1st against the month before.
 *   Gold:   by invitation from Techwide.
 * Pure: no network, no database.
 */
export type Level = "bronze" | "silver" | "gold";
export const LEVELS: Level[] = ["bronze", "silver", "gold"];
export const SILVER_SALES = 1000;
export const SILVER_VIDEOS = 10;
export const KEEP_MONTHLY = SILVER_SALES;

export type LevelState = { level: Level; levelSince: string | null; goldInvited: boolean; demotedAt: string | null; checkedMonth: string | null };
/**
 * `lastMonthSales` / `lastMonthSampleVideos`: the month before `today`; `monthSales` / `monthSampleVideos`: this month so far.
 * Null when they can't be known yet.
 */
export type Totals = { today: string; lastMonthSales: number | null; lastMonthSampleVideos: number | null; monthSales: number | null; monthSampleVideos: number | null };

/** Either target reached (owner, 1 Nov 2026). */
export const silverReached = (sales: number | null, sampleVideos: number | null) => (sales ?? 0) >= SILVER_SALES || (sampleVideos ?? 0) >= SILVER_VIDEOS;

export function nextLevel(s: LevelState, t: Totals): LevelState {
  const month = t.today.slice(0, 7);
  const next = { ...s, checkedMonth: month };
  const set = (level: Level) => {
    if (next.level !== level) {
      next.level = level;
      next.levelSince = t.today;
    }
  };

  if (s.goldInvited) {
    set("gold");
    return next;
  }
  const now = silverReached(t.monthSales, t.monthSampleVideos);
  // A new month, a creator's first check, or a Gold invitation withdrawn: kept if last month reached either one.
  if (s.checkedMonth === null || s.checkedMonth < month || next.level === "gold") {
    if (t.lastMonthSales === null && t.lastMonthSampleVideos === null && !now) {
      if (next.level === "gold") set("bronze");
      return next;
    }
    const earned: Level = now || silverReached(t.lastMonthSales, t.lastMonthSampleVideos) ? "silver" : "bronze";
    if (next.level === "silver" && earned === "bronze") next.demotedAt = t.today;
    if (earned === "silver") next.demotedAt = null;
    set(earned);
    return next;
  }
  // Mid-month: up to Silver as soon as she reaches either one.
  if (now && next.level === "bronze") {
    next.demotedAt = null;
    set("silver");
  }
  return next;
}

type Day = { day: string; paid: number; sample_videos?: number };

/** Sales within one month ('YYYY-MM') from daily lifetime totals: the month's last total minus the total before it began. */
export function monthSales(days: Day[], month: string): number | null {
  return monthDelta(days, month, (d) => d.paid);
}

/** Any lifetime total's growth within one month, e.g. videos posted for samples. */
export function monthDelta(days: Day[], month: string, of: (d: Day) => number): number | null {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const inMonth = sorted.filter((d) => d.day.startsWith(month));
  if (!inMonth.length) return null;
  const before = sorted.filter((d) => d.day < `${month}-01`).at(-1);
  return Math.max(0, of(inMonth.at(-1)!) - of(before ?? inMonth[0]));
}

/** The month before 'YYYY-MM-DD', as 'YYYY-MM'. */
export const previousMonth = (day: string) => {
  const [y, m] = day.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
