import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { PlannedTask, TaskKind } from "./plan.ts";

export type TaskRow = PlannedTask & { run_date: string; status: string; attempts: number; cursor: string | null; result_count: number };

const json = (body: unknown, prefer = "return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });
const taskUrl = (t: { run_date: string; key: string }) => `refresh_tasks?run_date=eq.${t.run_date}&key=eq.${encodeURIComponent(t.key)}`;

export async function hasTasks(runDate: string): Promise<boolean> {
  const res = await supabaseRest(`refresh_tasks?run_date=eq.${runDate}&select=key&limit=1`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** True when the day's task list has a task with this key. */
export async function hasTask(runDate: string, key: string): Promise<boolean> {
  const res = await supabaseRest(`refresh_tasks?run_date=eq.${runDate}&key=eq.${encodeURIComponent(key)}&select=key&limit=1`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** True when Rankings were built for this data date from that date's own lists (none borrowed from an earlier day). */
export async function rankingsBuilt(day: string): Promise<boolean> {
  const res = await supabaseRest(`market_snapshots?dataset=eq.rankings&slot=eq.built&as_of=eq.${day}&select=as_of,borrowed:items->0->listDays&limit=1`);
  const [row] = (await res.json()) as { borrowed: Record<string, string> | null }[];
  return !!row && !Object.keys(row.borrowed ?? {}).length;
}

/** Notes the first time TikTok's lists for `date` were seen (to learn when TikTok publishes them). */
export async function notePublished(date: string, at: string): Promise<void> {
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ key: `best_lists_published:${date}`, value: { at }, updated_at: at }) });
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

/** `tt_level`: TikTok's creator level (0-8), known when the marketplace search was split by level. */
export type CreatorUpsert = { creator_key: string; open_id: string | null; username: string | null } & ({ best: unknown; best_rank: number | null } | { market: unknown; tt_level?: number });

/** Records creators seen in a list. Each source only overwrites its own column, so a profile fetched earlier is kept. */
export async function upsertCreators(rows: CreatorUpsert[]): Promise<void> {
  const byKey = new Map(rows.map((r) => [r.creator_key, { ...r, seen_at: new Date().toISOString() }]));
  if (byKey.size)
    await supabaseRest("market_creators?on_conflict=creator_key", json([...byKey.values()], "resolution=merge-duplicates,return=minimal"));
}

/** How old a profile may get before it is read again, so a WhatsApp number or email added to a bio later is picked up. */
export const DETAIL_REFRESH_DAYS = 30;

/**
 * Creators whose profile is due: never read yet (best-seller creators first), then, once everyone has one, profiles older
 * than DETAIL_REFRESH_DAYS, oldest first (owner, 14 Oct 2026: no creator with WhatsApp or email missed).
 */
export async function creatorsNeedingDetail(limit: number): Promise<{ creator_key: string; open_id: string }[]> {
  const fresh = (await (await supabaseRest(`market_creators?detail_at=is.null&open_id=not.is.null&select=creator_key,open_id&order=best_rank.asc.nullslast&limit=${limit}`)).json()) as { creator_key: string; open_id: string }[];
  if (fresh.length) return fresh;
  const old = new Date(Date.now() - DETAIL_REFRESH_DAYS * 86_400_000).toISOString();
  return (await supabaseRest(`market_creators?detail_at=lt.${old}&open_id=not.is.null&select=creator_key,open_id&order=detail_at.asc&limit=${limit}`)).json();
}

export async function saveDetail(key: string, detail: unknown, error: string | null): Promise<void> {
  await supabaseRest(`market_creators?creator_key=eq.${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ detail, detail_error: error, detail_at: new Date().toISOString() }),
  });
}

/** True while the month's level-split marketplace search (planned on the 1st) is still running, on any day. */
export async function levelPassOpen(): Promise<boolean> {
  const res = await supabaseRest(`refresh_tasks?kind=eq.marketplace&key=like.${encodeURIComponent("marketplace|lv*")}&status=in.(pending,running)&select=key&limit=1`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** Linked creators whose labels are due: agency not checked in `days` days, or TikTok level not checked since `levelSince`. */
export async function tagsDue(days: number, levelSince: string): Promise<{ user_id: string }[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const due = `or=(agency_at.is.null,agency_at.lt.${since},tt_level_at.is.null,tt_level_at.lt.${encodeURIComponent(levelSince)})`;
  const res = await supabaseRest(`affiliate_connections?user_id=not.is.null&username=not.is.null&${due}&select=user_id&limit=2000`);
  return res.json();
}

/** A linked creator's TikTok username, or null. */
export async function linkedUsername(userId: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`affiliate_connections?user_id=eq.${userId}&username=not.is.null&select=username&limit=1`)).json()) as { username: string }[];
  return row?.username ?? null;
}

/** Saves a creator's labels (both null: TikTok's marketplace doesn't list them). */
export async function saveTags(userId: string, agency: "managed" | "independent" | null, level: number | null): Promise<void> {
  const at = new Date().toISOString();
  await supabaseRest(`affiliate_connections?user_id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ agency, agency_at: at, tt_level: level, tt_level_at: at }) });
}

/** Tasks of one kind still waiting or running for a day; `except`: leave out tasks parked with this cursor. */
export async function openTaskCount(runDate: string, kind: string, except?: string): Promise<number> {
  const skip = except ? `&or=(cursor.is.null,cursor.neq.${except})` : "";
  const res = await supabaseRest(`refresh_tasks?run_date=eq.${runDate}&kind=eq.${kind}&status=in.(pending,running)${skip}&select=key`, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
}

/** Rebuilds the TAP Marketplace table from the latest TAP snapshot; returns how many products it holds. */
export async function rebuildTapCatalog(): Promise<number> {
  const res = await supabaseRest("rpc/rebuild_tap_catalog", json({}, "return=representation"));
  return Number(await res.json()) || 0;
}

/** Every item of one dataset's snapshots for a day, all slots joined (e.g. every campaign's sales). */
export async function snapshotItems(dataset: string, asOf: string): Promise<unknown[]> {
  const rows = (await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&as_of=eq.${asOf}&select=items`)).json()) as { items: unknown[] }[];
  return rows.flatMap((r) => r.items ?? []);
}

/** Shop and units sold for every Marketplace product (for Golden Sellers). */
export async function catalogSales(): Promise<{ id: string; shop: string | null; sold: number }[]> {
  const out: { id: string; shop: string | null; sold: number }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`tap_catalog?select=product_id,shop,sold&order=product_id&offset=${offset}&limit=1000`)).json()) as { product_id: string; shop: string | null; sold: number }[];
    out.push(...page.map((r) => ({ id: r.product_id, shop: r.shop, sold: Number(r.sold) })));
    if (page.length < 1000) return out;
  }
}

/** Saves creator rows for My TAP products (one per campaign, product and creator; newer numbers replace older ones). */
export async function upsertCreatorProducts(rows: Record<string, unknown>[]): Promise<void> {
  await supabaseRest("tap_creator_products?on_conflict=campaign_id,product_id,username", json(rows, "resolution=merge-duplicates,return=minimal"));
}
