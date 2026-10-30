/**
 * Creator levels (owner, 14 Oct 2026):
 *   Bronze: when you join, always kept.
 *   Silver: this month's level comes from last month: RM1,000 in TAP sales last month and videos posted for 10 samples.
 *   Gold:   by invitation from Techwide.
 * Levels change on the 1st of each month (Malaysia time), never mid-month. A new creator gets theirs from last month's
 * numbers when they join. Only sales through Techwide's TAP campaigns count.
 * Pure: no network, no database.
 */
export type Level = "bronze" | "silver" | "gold";
export const LEVELS: Level[] = ["bronze", "silver", "gold"];
export const SILVER_SALES = 1000;
export const SILVER_VIDEOS = 10;
export const KEEP_MONTHLY = SILVER_SALES;

export type LevelState = { level: Level; levelSince: string | null; goldInvited: boolean; demotedAt: string | null; checkedMonth: string | null };
/** `lastMonthSales`: TAP sales in the month before `today`; null when they can't be known yet. */
export type Totals = { today: string; sampleVideos: number; lastMonthSales: number | null };

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
  // A new month, a creator's first check, or a Gold invitation withdrawn: the level last month earned.
  if (s.checkedMonth === null || s.checkedMonth < month || next.level === "gold") {
    if (t.lastMonthSales === null) {
      if (next.level === "gold") set("bronze");
      return next;
    }
    const earned: Level = t.lastMonthSales >= SILVER_SALES && t.sampleVideos >= SILVER_VIDEOS ? "silver" : "bronze";
    if (next.level === "silver" && earned === "bronze") next.demotedAt = t.today;
    if (earned === "silver") next.demotedAt = null;
    set(earned);
  }
  return next;
}

type Day = { day: string; paid: number };

/** Sales within one month ('YYYY-MM') from daily lifetime totals: the month's last total minus the total before it began. */
export function monthSales(days: Day[], month: string): number | null {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const inMonth = sorted.filter((d) => d.day.startsWith(month));
  if (!inMonth.length) return null;
  const before = sorted.filter((d) => d.day < `${month}-01`).at(-1);
  return Math.max(0, inMonth.at(-1)!.paid - (before ?? inMonth[0]).paid);
}

/** The month before 'YYYY-MM-DD', as 'YYYY-MM'. */
export const previousMonth = (day: string) => {
  const [y, m] = day.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
