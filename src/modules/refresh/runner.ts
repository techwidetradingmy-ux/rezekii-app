import { AUTHOR_TYPES, CATEGORIES, PLAN_HOUR, mytDay, mytHour, planDay, type TaskKind } from "./plan.ts";
import type { Sessions } from "./sessions.ts";
import { ApiError, RATE_LIMITED, STEPS } from "./steps.ts";
import { addTasks, claimTask, completeDailyDays, hasTasks, pruneMarketData, updateTask, type TaskRow } from "./store.ts";

/** Daily lists per data date: creators (4 author types) and products (29 category lists), each in RM and US$. */
const DAILY_LISTS = (AUTHOR_TYPES.length + CATEGORIES.length) * 2;
const QUEUE: TaskKind[] = ["tap_campaigns", "tap_products", "tap_catalog", "tap_creators", "levels", "best", "rankings", "details"];
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

/**
 * One timer tick. From 06:00 Malaysia time the day's tasks are planned (once). Then one Creator Marketplace page
 * (that search allows about 3 calls a minute), then other tasks until `deadline`, about 1.2 s apart.
 */
export async function runRefresh(sessions: Sessions, deadline: number, now = Date.now()): Promise<RunSummary> {
  const runDate = mytDay(now);
  let planned = 0;
  if (mytHour(now) >= PLAN_HOUR && !(await hasTasks(runDate))) {
    await pruneMarketData(runDate);
    const tasks = planDay(now, await completeDailyDays(DAILY_LISTS));
    await addTasks(runDate, tasks);
    planned = tasks.length;
  }

  const ran: Record<string, string> = {};
  const page = await claimTask(["marketplace"]);
  if (page) await runTask(page, sessions, deadline, ran);

  while (Date.now() < deadline) {
    const t = await claimTask(QUEUE);
    if (!t) break;
    if (!(await runTask(t, sessions, deadline, ran))) break;
    await wait(GAP_MS);
  }
  return { planned, ran };
}
