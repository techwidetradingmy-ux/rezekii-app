/**
 * Creator levels, from the approved benefits list:
 *   Bronze: when you join, always kept.
 *   Silver: 10 sample videos + RM1,000 lifetime sales; kept with RM1,000 in sales every month, a month below returns you to Bronze.
 *   Gold:   by invitation from Techwide.
 * Levels change automatically at month end. The first Silver comes as soon as you qualify; after a demotion it comes back
 * at a month end, once that month's sales reach RM1,000 again (so one good day cannot bounce a creator straight back).
 * Pure: no network, no database.
 */
export type Level = "bronze" | "silver" | "gold";
export const LEVELS: Level[] = ["bronze", "silver", "gold"];
export const SILVER_SALES = 1000;
export const SILVER_VIDEOS = 10;
export const KEEP_MONTHLY = 1000;

export type LevelState = { level: Level; levelSince: string | null; goldInvited: boolean; demotedAt: string | null; checkedMonth: string | null };
export type Totals = { today: string; lifetime: number; sampleVideos: number; lastMonthSales: number | null };

export function nextLevel(s: LevelState, t: Totals): LevelState {
  const month = t.today.slice(0, 7);
  const monthEnd = s.checkedMonth !== null && s.checkedMonth < month;
  const qualified = t.lifetime >= SILVER_SALES && t.sampleVideos >= SILVER_VIDEOS;
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
  if (next.level === "gold") set(qualified ? "silver" : "bronze"); // invitation withdrawn

  if (monthEnd && t.lastMonthSales !== null) {
    if (next.level === "silver" && t.lastMonthSales < KEEP_MONTHLY) {
      set("bronze");
      next.demotedAt = t.today;
    } else if (next.level === "bronze" && next.demotedAt && qualified && t.lastMonthSales >= KEEP_MONTHLY) {
      set("silver");
      next.demotedAt = null;
    }
  }
  if (next.level === "bronze" && !next.demotedAt && qualified) set("silver");
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
