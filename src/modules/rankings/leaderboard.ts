import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { monthSales, previousMonth, type Level } from "../levels/rules.ts";
import { monthlyTapSales } from "../levels/store.ts";
import { linkedCreators } from "../sales/orders.ts";
import { mytDay } from "../refresh/plan.ts";
import { photoFor, savedPhotos } from "../photos/store.ts";
import type { Lang } from "../../lib/i18n/lang.ts";

/** `lv`: TikTok Shop creator level from their linked TikTok Shop account (null until checked). */
export type BoardRow = { handle: string; name: string; avatar: string | null; level: Level; gmv: number; videos: number; lv: number | null };
export type BoardMonth = { key: string; label: string; final: string; rows: BoardRow[] };
type Daily = { username: string; day: string; paid: number; videos: number };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 2026", or "2026年10月" in Chinese. */
const label = (key: string, lang: Lang) => (lang === "zh" ? `${key.slice(0, 4)}年${Number(key.slice(5))}月` : `${MON[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`);
/** The 1st of the next month: "1 Nov 2026", or "2026年11月1日" in Chinese. */
const nextFirst = (key: string, lang: Lang) => {
  const [y, m] = key.split("-").map(Number);
  if (lang === "zh") return m === 12 ? `${y + 1}年1月1日` : `${y}年${m + 1}月1日`;
  return m === 12 ? `1 Jan ${y + 1}` : `1 ${MON[m]} ${y}`;
};

/**
 * Monthly GMV leaderboard of Rezekii creators for this month and the 5 before: sales through Techwide's TAP campaigns, from
 * each creator's own orders when Rezekii reads them (as Levels counts them), otherwise from TikTok's TAP data.
 */
export async function leaderboard(lang: Lang = "en"): Promise<BoardMonth[]> {
  const today = mytDay(Date.now());
  const keys = [today.slice(0, 7)];
  while (keys.length < 6) keys.push(previousMonth(`${keys.at(-1)}-01`));
  type U = { id: string; tiktok_username: string; display_name: string | null; avatar_url: string | null };
  const users = (await (await supabaseRest("app_users?role=eq.creator&tiktok_username=not.is.null&select=id,tiktok_username,display_name,avatar_url&limit=5000")).json()) as U[];
  if (!users.length) return keys.map((key) => ({ key, label: label(key, lang), final: nextFirst(key, lang), rows: [] }));
  const levels = new Map(((await (await supabaseRest("creator_levels?select=user_id,level&limit=5000")).json()) as { user_id: string; level: Level }[]).map((l) => [l.user_id, l.level]));
  const ttLevels = new Map(((await (await supabaseRest("affiliate_connections?tt_level=not.is.null&select=user_id,tt_level&limit=5000")).json()) as { user_id: string; tt_level: number }[]).map((l) => [l.user_id, l.tt_level]));
  const from = `${previousMonth(`${keys.at(-1)}-01`)}-25`;
  const daily = (await (await supabaseRest(`creator_daily?day=gte.${from}&select=username,day,paid,videos&order=day&limit=100000`)).json()) as Daily[];
  const byUser = new Map<string, Daily[]>();
  for (const d of daily) byUser.set(d.username, [...(byUser.get(d.username) ?? []), { ...d, paid: Number(d.paid) }]);
  const linked = new Set(await linkedCreators());
  const fromOrders = new Map(await Promise.all(users.map(async (u) => [u.id, await monthlyTapSales(u.id, keys, linked).catch(() => null)] as const)));
  const saved = await savedPhotos().catch(() => new Map<string, string>());

  return keys.map((key) => {
    const rows = users.map((u) => {
      const days = byUser.get(u.tiktok_username.toLowerCase()) ?? [];
      const inMonth = days.filter((d) => d.day.startsWith(key));
      const before = days.filter((d) => d.day < `${key}-01`).at(-1) ?? inMonth[0];
      return {
        handle: `@${u.tiktok_username}`, name: u.display_name ?? u.tiktok_username, avatar: photoFor(u.tiktok_username, u.avatar_url, saved), level: levels.get(u.id) ?? "bronze", lv: ttLevels.get(u.id) ?? null,
        gmv: fromOrders.get(u.id)?.[key] ?? monthSales(days, key) ?? 0, videos: inMonth.length && before ? Math.max(0, inMonth.at(-1)!.videos - before.videos) : 0,
      };
    });
    rows.sort((a, b) => b.gmv - a.gmv || a.handle.localeCompare(b.handle));
    return { key, label: label(key, lang), final: nextFirst(key, lang), rows };
  });
}
