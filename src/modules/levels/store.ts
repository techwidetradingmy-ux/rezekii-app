import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { mytDay } from "../refresh/plan.ts";
import { historyDone, linkedCreators } from "../sales/orders.ts";
import { monthSales, nextLevel, previousMonth, type Level, type LevelState } from "./rules.ts";

const json = (body: unknown, prefer = "return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });

type LevelRow = { user_id: string; level: Level; level_since: string | null; gold_invited: boolean; demoted_at: string | null; checked_month: string | null; celebrated: Level };
export type DailyRow = { day: string; paid: number; sample_videos: number; videos: number; lives: number; samples_shipping: number; samples_delivered: number };

const toState = (r: LevelRow | undefined): LevelState => ({
  level: r?.level ?? "bronze", levelSince: r?.level_since ?? null, goldInvited: r?.gold_invited ?? false, demotedAt: r?.demoted_at ?? null, checkedMonth: r?.checked_month ?? null,
});

/** A creator's daily totals from the day before last month began. */
async function dailyRows(username: string, today: string): Promise<DailyRow[]> {
  const from = `${previousMonth(`${previousMonth(today)}-01`)}-28`;
  const rows = (await (await supabaseRest(`creator_daily?username=eq.${encodeURIComponent(username)}&day=gte.${from}&day=lte.${today}&select=day,paid,sample_videos,videos,lives,samples_shipping,samples_delivered&order=day`)).json()) as DailyRow[];
  return rows.map((r) => ({ ...r, paid: Number(r.paid) }));
}

/** Malaysian midnight starting a month ('YYYY-MM'), as an ISO time. */
const monthStart = (month: string) => `${month}-01T00:00:00+08:00`;
const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/** A creator's sales through Techwide's TAP campaigns between two times, from their own orders. */
async function tapSales(userId: string, from: string, to: string): Promise<number> {
  return Number(await (await supabaseRest("rpc/tap_sales", json({ p_user: userId, p_from: from, p_to: to }, "return=representation"))).json()) || 0;
}

/**
 * Where a creator's TAP sales come from: their own orders once their whole order history is read ("orders"); still being read
 * ("wait": no level yet, so a half-read history can't decide it); or TikTok's TAP data for creators whose orders Rezekii can't read.
 */
async function salesSource(userId: string, linked: Set<string>): Promise<"orders" | "wait" | "tap"> {
  if (!linked.has(userId)) return "tap";
  return (await historyDone(userId)) ? "orders" : "wait";
}

/**
 * A creator's TAP sales in each month ('YYYY-MM', the current month up to now), from their own orders; null when Rezekii
 * doesn't read their whole order history (the Rankings leaderboard then uses TikTok's TAP data). `linked`: linkedCreators().
 */
export async function monthlyTapSales(userId: string, months: string[], linked: Set<string>): Promise<Record<string, number> | null> {
  if ((await salesSource(userId, linked)) !== "orders") return null;
  const now = new Date().toISOString();
  const sums = await Promise.all(months.map((m) => tapSales(userId, monthStart(m), m === mytDay(Date.now()).slice(0, 7) ? now : monthStart(nextMonth(m)))));
  return Object.fromEntries(months.map((m, i) => [m, sums[i]]));
}

/**
 * Saves today's totals for every Rezekii creator, then sets each one's level: on the 1st from last month's TAP sales, and for a
 * new creator as soon as their sales are known. Returns how many changed.
 */
export async function updateLevels(today: string): Promise<number> {
  await supabaseRest("rpc/record_creator_daily", json({ d: today }));
  const users = (await (await supabaseRest("app_users?tiktok_username=not.is.null&role=eq.creator&select=id,tiktok_username&limit=5000")).json()) as { id: string; tiktok_username: string }[];
  const levels = (await (await supabaseRest("creator_levels?select=*&limit=5000")).json()) as LevelRow[];
  const byUser = new Map(levels.map((l) => [l.user_id, l]));
  const linked = new Set(await linkedCreators());
  const last = previousMonth(today);
  let changed = 0;
  for (const u of users) {
    const source = await salesSource(u.id, linked);
    if (source === "wait") continue;
    const days = await dailyRows(u.tiktok_username.toLowerCase(), today);
    const before = toState(byUser.get(u.id));
    const lastMonthSales = source === "orders" ? await tapSales(u.id, monthStart(last), monthStart(nextMonth(last))) : monthSales(days, last);
    const after = nextLevel(before, { today, sampleVideos: days.at(-1)?.sample_videos ?? 0, lastMonthSales });
    if (after.level !== before.level) changed++;
    await supabaseRest("creator_levels?on_conflict=user_id", json({
      user_id: u.id, level: after.level, level_since: after.levelSince, gold_invited: after.goldInvited, demoted_at: after.demotedAt, checked_month: after.checkedMonth, updated_at: new Date().toISOString(),
    }, "resolution=merge-duplicates,return=minimal"));
  }
  return changed;
}

/** A creator's level (Bronze until the first daily update). */
export async function levelOf(userId: string): Promise<Level> {
  const [row] = (await (await supabaseRest(`creator_levels?user_id=eq.${userId}&select=level&limit=1`)).json()) as { level: Level }[];
  return row?.level ?? "bronze";
}

export type LevelPage = {
  level: Level; levelSince: string | null; celebrated: Level; lifetime: number; sampleVideos: number;
  /** TAP sales last month: what decided this month's level. */
  lastMonth: number | null;
  month: { sales: number; videos: number; sampleVideos: number; delivered: number; shipping: number } | null; asOf: string | null;
};

/** Everything the Levels page shows for one creator, as of today (Malaysia time). */
export async function levelPage(userId: string, username: string | null): Promise<LevelPage> {
  const today = mytDay(Date.now());
  // The level, the daily totals and where the sales come from are read at the same time.
  const [[row], days, fromOrders] = await Promise.all([
    supabaseRest(`creator_levels?user_id=eq.${userId}&select=*&limit=1`).then((r) => r.json() as Promise<LevelRow[]>),
    username ? dailyRows(username.toLowerCase(), today) : Promise.resolve([] as DailyRow[]),
    linkedCreators().then(async (l) => (await salesSource(userId, new Set(l))) === "orders"),
  ]);
  const last = days.at(-1);
  const month = today.slice(0, 7);
  const prev = previousMonth(today);
  const before = [...days].filter((d) => d.day < `${month}-01`).at(-1) ?? days.find((d) => d.day.startsWith(month));
  // TAP sales from the creator's own orders when Rezekii reads them (the full history); otherwise from TikTok's TAP data.
  const [lifetime, thisMonth, lastMonth] = fromOrders
    ? await Promise.all([tapSales(userId, "2000-01-01T00:00:00Z", new Date().toISOString()), tapSales(userId, monthStart(month), new Date().toISOString()), tapSales(userId, monthStart(prev), monthStart(month))])
    : [last?.paid ?? 0, last && before ? monthSales(days, month) ?? 0 : null, monthSales(days, prev)];
  return {
    level: row?.level ?? "bronze", levelSince: row?.level_since ?? null, celebrated: row?.celebrated ?? "bronze",
    lifetime, sampleVideos: last?.sample_videos ?? 0, lastMonth,
    month: thisMonth !== null ? {
      sales: thisMonth, videos: last && before ? Math.max(0, last.videos - before.videos) : 0, sampleVideos: last && before ? Math.max(0, last.sample_videos - before.sample_videos) : 0,
      delivered: last?.samples_delivered ?? 0, shipping: last?.samples_shipping ?? 0,
    } : null,
    asOf: fromOrders ? today : last?.day ?? null,
  };
}

/** Remembers that the creator has seen the level-up screen for this level. */
export async function markCelebrated(userId: string, level: Level): Promise<void> {
  await supabaseRest(`creator_levels?user_id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ celebrated: level }) });
}

/** One row of the benefits list: a label and the value for Bronze, Silver and Gold ("yes", "no" or short text). */
export type Benefit = { label: string; v: [string, string, string]; key?: boolean };
export const DEFAULT_BENEFITS: Benefit[] = [
  { label: "Commission on Techwide campaign links", v: ["Open Plan rate", "Open Plan + 1%", "Special rate for you"], key: true },
  { label: "Free product samples", v: ["yes", "yes", "yes"] },
  { label: "Level emblem on your profile and in Rankings", v: ["yes", "yes", "yes"] },
  { label: "How you get it", v: ["When you join", "10 sample videos + RM1,000 sales through Rezekii last month", "By invitation"] },
  { label: "How you keep it", v: ["Always", "RM1,000 sales through Rezekii every month", "Set by Techwide"] },
];

/** The level benefits list, edited by Techwide on the Benefits screen. */
export async function benefits(): Promise<{ list: Benefit[]; updatedAt: string | null }> {
  const [row] = (await (await supabaseRest("app_settings?key=eq.level_benefits&select=value,updated_at&limit=1")).json()) as { value: Benefit[]; updated_at: string }[];
  return Array.isArray(row?.value) && row.value.length ? { list: row.value, updatedAt: row.updated_at } : { list: DEFAULT_BENEFITS, updatedAt: null };
}

export async function saveBenefits(list: Benefit[], userId: string): Promise<void> {
  await supabaseRest("app_settings?on_conflict=key", json({ key: "level_benefits", value: list, updated_at: new Date().toISOString(), updated_by: userId }, "resolution=merge-duplicates,return=minimal"));
}

/** The public level card for a creator's TikTok username (shows the level only, never sales). */
export async function publicLevel(username: string): Promise<{ handle: string; name: string | null; level: Level } | null> {
  if (!/^[a-z0-9._]{2,24}$/i.test(username)) return null;
  const [u] = (await (await supabaseRest(`app_users?tiktok_username=eq.${encodeURIComponent(username.toLowerCase())}&role=eq.creator&select=id,display_name,tiktok_username&limit=1`)).json()) as { id: string; display_name: string | null; tiktok_username: string }[];
  if (!u) return null;
  return { handle: `@${u.tiktok_username}`, name: u.display_name, level: await levelOf(u.id) };
}
