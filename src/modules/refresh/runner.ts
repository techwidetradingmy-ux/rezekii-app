import { getBestselling } from "../../integrations/tiktok-shop/seller.ts";
import { AUTHOR_TYPES, CATEGORIES, DATA_LAG_DAYS, LATE_HOUR, PLAN_HOUR, mytDay, mytHour, planDay, planNewest, type TaskKind } from "./plan.ts";
import type { Sessions } from "./sessions.ts";
import { ApiError, RATE_LIMITED, STEPS } from "./steps.ts";
import { addTasks, claimTask, completeDailyDays, hasTask, levelPassOpen, notePublished, profilesWaiting, pruneMarketData, rankingsBuilt, updateTask, type TaskRow } from "./store.ts";

/** Daily lists per data date: creators (4 author types) and products (29 category lists), each in RM and US$. */
const DAILY_LISTS = (AUTHOR_TYPES.length + CATEGORIES.length) * 2;
const QUEUE: TaskKind[] = ["tap_campaigns", "tap_products", "tap_catalog", "tap_samples", "tap_creators", "levels", "best", "rankings", "videos", "orders", "details", "agency"];
/** Gap between calls to TikTok's analytics and partner APIs. */
const GAP_MS = 1200;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RunSummary = { planned: number; ran: Record<string, string> };

/** Runs one task and saves what happened. Returns false when TikTok said to slow down. */
async function runTask(t: TaskRow, sessions: Sessions, deadline: number, ran: Record<string, string>): Promise<boolean> {
  try {
    const r = await STEPS[t.kind](t, { sessions, deadline });
    if (r.followUps?.length) await addTasks(t.run_date, r.followUps);
    if (r.more) await updateTask(t, { status: "pending", cursor: r.cursor, count: r.count, error: null, nextAt: new Date(Date.now() + (r.waitMs ?? 0)), resetAttempts: true });
    else await updateTask(t, { status: "done", cursor: null, count: r.count, error: null, resetAttempts: true });
    ran[t.key] = `${r.more ? "more" : "done"} (${r.count})`;
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof ApiError && err.code === RATE_LIMITED) {
      await updateTask(t, { status: "pending", error: message, nextAt: new Date(Date.now() + 60_000) });
      ran[t.key] = "rate-limited";
      return false;
    }
    // Other failures retry 3 times, 5, 10 and 15 minutes apart; a missing connection fails the same way every time.
    const retry = t.attempts < 4;
    await updateTask(t, { status: retry ? "pending" : "failed", error: message, nextAt: new Date(Date.now() + t.attempts * 5 * 60_000) });
    ran[t.key] = `${retry ? "retry" : "failed"}: ${message}`;
    return true;
  }
}

/** Whether TikTok has published its best-seller lists for `date` yet (one cheap call: the 1-day creators list). */
async function listsOut(sessions: Sessions, date: string): Promise<boolean> {
  try {
    const s = await sessions.seller();
    const r = await getBestselling(s.token, s.cipher, "creators", { date, timeSlot: "1D", currency: "LOCAL", authorType: "ALL" });
    return r.code === 0 && ((r.data?.creators as unknown[] | undefined)?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * One timer tick. Right after midnight (Malaysia time) the day's tasks are planned (once), and yesterday's lists as soon as TikTok has them. Then one Creator Marketplace page
 * (that search allows about 3 calls a minute), then other tasks until `deadline`, about 1.2 s apart.
 */
export async function runRefresh(sessions: Sessions, deadline: number, now = Date.now()): Promise<RunSummary> {
  const runDate = mytDay(now);
  let planned = 0;
  // The day's plan is marked by its first task, so yesterday's lists (planned on their own) don't count as the plan.
  if (mytHour(now) >= PLAN_HOUR && !(await hasTask(runDate, "tap_campaigns"))) {
    await pruneMarketData(runDate);
    const tasks = planDay(now, await completeDailyDays(DAILY_LISTS), await rankingsBuilt(mytDay(now, DATA_LAG_DAYS)), await levelPassOpen());
    await addTasks(runDate, tasks);
    planned = tasks.length;
  }
  // TikTok publishes yesterday's lists during the day: every 15 minutes check whether TikTok has them and, once it does, plan
  // that day as the newest too (its Rankings build waits for every list), and note when TikTok published them.
  const yesterday = mytDay(now, 1);
  if (mytHour(now) >= LATE_HOUR && new Date(now).getUTCMinutes() % 15 === 0 && !(await hasTask(runDate, `rankings|${yesterday}`)) && (await listsOut(sessions, yesterday))) {
    const late = planNewest(yesterday);
    await addTasks(runDate, late);
    await notePublished(yesterday, new Date(now).toISOString()).catch(() => undefined);
    planned += late.length;
  }

  const ran: Record<string, string> = {};
  // Profiles first (owner, 14 Oct 2026: WhatsApp numbers are the urgent part): while any creator has none, the marketplace
  // search, the monthly level pass included, waits, so profiles get all of TikTok's shared rate limit.
  const page = (await profilesWaiting()) ? null : await claimTask(["marketplace"]);
  if (page) await runTask(page, sessions, deadline, ran);

  while (Date.now() < deadline) {
    const t = await claimTask(QUEUE);
    if (!t) break;
    if (!(await runTask(t, sessions, deadline, ran))) break;
    await wait(GAP_MS);
  }
  return { planned, ran };
}
