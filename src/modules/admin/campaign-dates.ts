/**
 * TikTok's campaign date rules, as its campaign edit answered on a draft campaign (16 Oct 2026):
 * - the campaign runs at least 1 day and at most exactly 360 days from its start time (16032002);
 * - registration opens with the campaign and stays open at least 1 day, closing no later than the campaign ends (16032003);
 * - a new start time must not have passed.
 * Shared by the campaign form and the server, so both keep the same limits. Days are Malaysia days (YYYY-MM-DD), times Unix seconds.
 */
export const DAY = 86_400;
const MYT = 8 * 3600;
export const MAX_DAYS = 360;
/** A start time that has passed becomes this many seconds from now. */
const START_LEAD = 600;

export const dayStart = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000) - MYT;
export const dayEnd = (d: string) => dayStart(d) + DAY - 1;
/** A Unix time as a Malaysia day. */
export const toDay = (unix: number | undefined | null) => (unix ? new Date((unix + MYT) * 1000).toISOString().slice(0, 10) : "");
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY * 1000).toISOString().slice(0, 10);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2027-10-10" as "10 Oct 2027". */
export const longDay = (d: string) => { const [y, m, n] = d.split("-").map(Number); return `${n} ${MON[m - 1]} ${y}`; };

/**
 * When the campaign really starts: an existing campaign's saved start (`saved`) while its start day is unchanged; otherwise the
 * start day, or 10 minutes from `now` when that has already passed.
 */
export const startTime = (day: string, now: number, saved?: number | null) => (saved && toDay(saved) === day ? saved : Math.max(dayStart(day), Math.floor(now / 1000) + START_LEAD));
/** The latest end time TikTok allows for a campaign starting at `start`: exactly 360 days later. */
export const latestEnd = (start: number) => start + MAX_DAYS * DAY;
/** The last day the campaign (and its registration) can end on. */
export const lastEndDay = (start: number) => toDay(latestEnd(start) - 1);
/** The first day the campaign (and its registration) can end on: at least 1 day after the start. */
export const firstEndDay = (start: number) => toDay(start + DAY);
