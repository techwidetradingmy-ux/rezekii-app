import { callApi } from "../../integrations/tiktok-shop/api.ts";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";

/**
 * When each of her LIVEs started and ended (owner, 3 Nov 2026: LIVE length and sales per LIVE hour), from TikTok's LIVE
 * data (needs the LIVE permission, given when she links or re-links). TikTok often answers "Internal error" for now, so each
 * LIVE is tried at most 3 times a day, in the background, and kept once it's known. Times are unix seconds.
 */
export type LiveTime = { start: number; end: number };
type Saved = Record<string, LiveTime | { day: string; tries: number }>;

const TRIES = 3;
const AT_ONCE = 4;
const key = (userId: string) => `live_times:${userId}`;
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const known = (v: Saved[string] | undefined): v is LiveTime => !!v && "start" in v;

async function saved(userId: string): Promise<Saved> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${encodeURIComponent(key(userId))}&select=value&limit=1`)).json().catch(() => [])) as { value: Saved }[];
  return row?.value ?? {};
}

/** The LIVE times Rezekii knows for these LIVEs. */
export async function liveTimes(userId: string, ids: string[]): Promise<Record<string, LiveTime>> {
  const all = await saved(userId);
  return Object.fromEntries(ids.flatMap((id) => (known(all[id]) ? [[id, all[id] as LiveTime]] : [])));
}

/**
 * A LIVE's first and last minute with any activity, from TikTok's per-minute trends (whichever answers). TikTok's Internal error
 * comes and goes from one call to the next (3 Nov 2026), so each is asked twice before moving on (owner, 3 Nov 2026).
 */
async function readTime(token: string, id: string): Promise<LiveTime | null> {
  for (const part of ["interactive_trend_performances", "view_trend_performances", "interactive_trend_performances", "view_trend_performances"]) {
    const r = await callApi<Record<string, { data_points?: { timestamp?: number; value?: string }[] }[] | undefined>>({ method: "GET", path: `/analytics/202309/live_rooms/${id}/${part}`, accessToken: token }).catch(() => null);
    if (r?.code !== 0) continue;
    const points = Object.values(r.data ?? {}).flatMap((series) => (Array.isArray(series) ? series : [])).flatMap((s) => s.data_points ?? []);
    const busy = points.filter((p) => p.timestamp && Number(p.value) > 0).map((p) => p.timestamp!);
    const at = (busy.length ? busy : points.map((p) => p.timestamp ?? 0).filter(Boolean));
    if (at.length) return { start: Math.min(...at), end: Math.max(...at) };
  }
  return null;
}

/** Reads the times of up to 4 LIVEs not known yet (newest first), each at most 3 times a day, and keeps what it learns. */
export async function learnLiveTimes(userId: string, newestFirst: string[]): Promise<void> {
  const all = await saved(userId);
  const day = today();
  const todo = newestFirst.filter((id) => { const v = all[id]; return !known(v) && !(v && v.day === day && v.tries >= TRIES); }).slice(0, AT_ONCE);
  if (!todo.length) return;
  const token = await approvedCreatorToken(userId);
  if (!token) return;
  const got = await Promise.all(todo.map((id) => readTime(token, id)));
  todo.forEach((id, i) => {
    const prev = all[id];
    // A LIVE still on (activity in the last 30 minutes) is read again later, without counting a try.
    if (got[i] && got[i]!.end > Date.now() / 1000 - 1800) return;
    all[id] = got[i] ?? { day, tries: (prev && !known(prev) && prev.day === day ? prev.tries : 0) + 1 };
  });
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: key(userId), value: all, updated_at: new Date().toISOString() }) });
}
