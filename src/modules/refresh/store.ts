import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { PlannedTask, TaskKind } from "./plan.ts";

export type TaskRow = PlannedTask & { run_date: string; status: string; attempts: number; cursor: string | null; result_count: number };

const json = (body: unknown, prefer = "return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });
const taskUrl = (t: { run_date: string; key: string }) => `refresh_tasks?run_date=eq.${t.run_date}&key=eq.${encodeURIComponent(t.key)}`;

export async function hasTasks(runDate: string): Promise<boolean> {
  const res = await supabaseRest(`refresh_tasks?run_date=eq.${runDate}&select=key&limit=1`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** Adds the day's tasks. Tasks already there (another run planned first) are left alone. */
export async function addTasks(runDate: string, tasks: PlannedTask[]): Promise<void> {
  for (let i = 0; i < tasks.length; i += 500)
    await supabaseRest("refresh_tasks?on_conflict=run_date,key", {
      ...json(tasks.slice(i, i + 500).map((t) => ({ run_date: runDate, ...t })), "resolution=ignore-duplicates,return=minimal"),
    });
}

export async function claimTask(kinds: TaskKind[]): Promise<TaskRow | null> {
  const res = await supabaseRest("rpc/claim_refresh_task", json({ kinds }, "return=representation"));
  const [row] = (await res.json()) as TaskRow[];
  return row ?? null;
}

/** Saves a task's outcome: done, failed, or back to pending (more pages, a retry, or a rate limit) at `nextAt`. */
export async function updateTask(
  t: TaskRow,
  patch: { status: "pending" | "done" | "failed"; cursor?: string | null; count?: number; error?: string | null; nextAt?: Date; resetAttempts?: boolean },
) {
  await supabaseRest(taskUrl(t), {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      status: patch.status,
      ...(patch.cursor !== undefined ? { cursor: patch.cursor } : {}),
      ...(patch.count !== undefined ? { result_count: t.result_count + patch.count } : {}),
      ...(patch.error !== undefined ? { last_error: patch.error } : {}),
      ...(patch.nextAt ? { next_attempt_at: patch.nextAt.toISOString() } : {}),
      ...(patch.resetAttempts ? { attempts: 0 } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function completeDailyDays(expected: number): Promise<Set<string>> {
  const res = await supabaseRest("rpc/complete_daily_days", json({ expected }, "return=representation"));
  return new Set(((await res.json()) as (string | { complete_daily_days: string })[]).map((r) => (typeof r === "string" ? r : r.complete_daily_days)));
}

/** Closes earlier days' leftovers and deletes old lists. Called once per day, just before the day is planned. */
export async function pruneMarketData(today: string): Promise<void> {
  await supabaseRest("rpc/prune_market_data", json({ today }));
}

export async function saveSnapshot(dataset: string, slot: string, asOf: string, items: unknown[]): Promise<void> {
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    ...json({ dataset, slot, as_of: asOf, items, fetched_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal"),
  });
}

export type CreatorUpsert = { creator_key: string; open_id: string | null; username: string | null } & ({ best: unknown; best_rank: number | null } | { market: unknown });

/** Records creators seen in a list. Each source only overwrites its own column, so a profile fetched earlier is kept. */
export async function upsertCreators(rows: CreatorUpsert[]): Promise<void> {
  const byKey = new Map(rows.map((r) => [r.creator_key, { ...r, seen_at: new Date().toISOString() }]));
  if (byKey.size)
    await supabaseRest("market_creators?on_conflict=creator_key", json([...byKey.values()], "resolution=merge-duplicates,return=minimal"));
}

/** New creators still without a profile, best-seller creators first. */
export async function creatorsNeedingDetail(limit: number): Promise<{ creator_key: string; open_id: string }[]> {
  const res = await supabaseRest(`market_creators?detail_at=is.null&open_id=not.is.null&select=creator_key,open_id&order=best_rank.asc.nullslast&limit=${limit}`);
  return res.json();
}

export async function saveDetail(key: string, detail: unknown, error: string | null): Promise<void> {
  await supabaseRest(`market_creators?creator_key=eq.${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ detail, detail_error: error, detail_at: new Date().toISOString() }),
  });
}
