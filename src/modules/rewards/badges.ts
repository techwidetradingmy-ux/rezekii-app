import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { benefits, levelOf } from "../levels/store.ts";
import { dayOf, missionDays, streakOf } from "./rules.ts";

/**
 * Level & Badges on real data (owner, 31 Oct 2026). Each badge is earned from what Rezekii can see: a scan, linked accounts, the
 * streak tiers she has reached, a sample with three videos, her commission so far, and her Rezekii level.
 */

export type BadgeState = { name: string; got: boolean; progress?: [number, number] };
/** Each level's rule and what it gives, from the benefits list Techwide edits in Admin (Bronze, Silver, Gold). */
export type LevelInfo = { name: string; how: string; gives: string[] };
export type Badges = { level: "bronze" | "silver" | "gold"; ttLevel: number | null; streak: number; since: string | null; levels: LevelInfo[]; badges: BadgeState[] };

const json = async <T>(path: string): Promise<T[]> => (await supabaseRest(path)).json() as Promise<T[]>;

export async function badgesFor(userId: string): Promise<Badges> {
  const [level, [conn], tt, social, ledger, earned, [user], perks] = await Promise.all([
    levelOf(userId).catch(() => "bronze" as const),
    json<{ username: string; showcase_at: string | null; tt_level: number | null }>(`affiliate_connections?user_id=eq.${userId}&select=username,showcase_at,tt_level&limit=1`),
    json<{ open_id: string }>(`tiktok_connections?user_id=eq.${userId}&select=open_id&limit=1`),
    json<{ id: string }>(`social_accounts?user_id=eq.${userId}&select=id&limit=1`),
    json<{ kind: string; ref: string; day: string | null }>(`credit_ledger?user_id=eq.${userId}&side=eq.creator&or=(kind.eq.mission,kind.eq.streak)&select=kind,ref,day&limit=5000`),
    supabaseRest("rpc/commission_total", { method: "POST", body: JSON.stringify({ p_user: userId }) }).then((r) => r.json() as Promise<number>).catch(() => 0),
    json<{ created_at: string }>(`app_users?id=eq.${userId}&select=created_at&limit=1`),
    benefits().then((b) => b.list).catch(() => []),
  ]);
  const levels = ["Bronze", "Silver", "Gold"].map((name, i) => ({
    name,
    how: perks.find((r) => /how you get it/i.test(r.label))?.v[i] ?? "",
    gives: perks.filter((r) => !/how you (get|keep) it/i.test(r.label) && r.v[i] !== "no").map((r) => (r.v[i] === "yes" ? r.label : `${r.label}: ${r.v[i]}`)),
  }));
  const sampleStar = conn?.username
    ? (await json<{ product_id: string }>(`tap_creator_products?username=eq.${encodeURIComponent(conn.username.toLowerCase())}&videos=gte.3&sample_status=not.is.null&sample_status=neq.NotRequested&select=product_id&limit=1`)).length > 0
    : false;
  const tiers = new Set(ledger.filter((r) => r.kind === "streak").map((r) => r.ref));
  const streak = streakOf(missionDays(ledger), dayOf(Date.now()));
  return {
    level,
    ttLevel: conn ? conn.tt_level : null,
    streak,
    since: user?.created_at ?? null,
    levels,
    badges: [
      { name: "First scan", got: !!conn?.showcase_at },
      { name: "Link master", got: !!conn && tt.length > 0 && social.length > 0 },
      { name: "7-day streak", got: tiers.has("tier:7") },
      { name: "Sample star", got: sampleStar },
      { name: "Highly active", got: tiers.has("tier:30"), progress: [Math.min(streak, 30), 30] },
      { name: "First RM 1,000", got: Number(earned) >= 1000 },
      { name: "Silver", got: level === "silver" || level === "gold" },
      { name: "Gold", got: level === "gold" },
    ],
  };
}
