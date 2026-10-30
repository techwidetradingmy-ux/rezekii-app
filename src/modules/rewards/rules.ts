/**
 * Rewards rules (owner, 28-30 Oct 2026), in one place. Credits aren't cash; they pay for posting to many apps at once.
 * Amounts here are what the screens promise; change them here only.
 */

/** Malaysia's business day: missions reset at midnight Malaysia time (UTC+8, no daylight saving). */
const MYT = 8 * 3600_000;
export const dayOf = (t: number | string) => new Date((typeof t === "number" ? t : Date.parse(t)) + MYT).toISOString().slice(0, 10);
export const dayStart = (day: string) => Date.parse(`${day}T00:00:00+08:00`);
export const addDays = (day: string, n: number) => dayOf(dayStart(day) + n * 86400_000);

/** Consecutive days with a daily mission claimed, up to today (or yesterday, before today is counted). */
export function streakOf(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
/** The business days a daily mission was claimed on, from ledger rows. */
export const missionDays = (rows: { kind: string; ref: string; day: string | null }[]) =>
  new Set(rows.filter((r) => r.kind === "mission" && r.ref.startsWith("d:") && r.day).map((r) => r.day as string));

/** Every new account gets these free, to try Post Everywhere (owner, 30 Oct 2026). */
export const WELCOME_CREDITS = 20;
/** Earned credits last 12 months; the oldest are used first. */
export const CREDIT_LIFE_DAYS = 365;
/** Cross-channel posting: credits per channel (owner, 28 Oct 2026). Drafts are free; failed or cancelled channels are refunded. */
export const POST_CREDITS = 5;

/** Win-win referral: the same for both sides, creators and sellers (owner, 28 Oct 2026). */
export const REFERRAL_REWARD = { inviter: 50, friend: 50 };
/** A friend counts once they link their shop within this many days of joining. */
export const REFERRAL_DAYS = 14;

/** Starter missions are open for the first days after joining. */
export const STARTER_DAYS = 7;

/** Streak tiers: bonus credits the first time each one is reached. */
export const TIERS = [
  { days: 3, bonus: 20 },
  { days: 7, bonus: 50 },
  { days: 14, bonus: 100 },
  { days: 30, bonus: 300 },
  { days: 60, bonus: 600 },
  { days: 100, bonus: 1000 },
];

/** Bonus chests after a third, two thirds and all of today's daily missions. */
export const chestsFor = (n: number) => [
  { at: Math.ceil(n / 3), bonus: 10 },
  { at: Math.ceil((n * 2) / 3), bonus: 20 },
  { at: n, bonus: 40 },
];
