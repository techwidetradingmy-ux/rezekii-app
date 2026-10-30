import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { missionCatalog } from "../rewards/missions.ts";

const DAY = 86_400_000;
type Row = { user_id: string; side: string; ref: string; amount: number; kind: string; created_at: string };

/**
 * Missions as they really run (owner, 31 Oct 2026): each mission's claims (all time and the last 7 days) and people, and each
 * person's progress, from the credit ledger (every claim is a credit row with the mission in its reference).
 */
export async function missionsReport() {
  const rows = (await (await supabaseRest("credit_ledger?kind=in.(mission,chest,streak)&select=user_id,side,ref,amount,kind,created_at&order=created_at.desc&limit=10000")).json()) as Row[];
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const idOf = (ref: string) => (ref.startsWith("d:") || ref.startsWith("o:") ? ref.split(":")[1] : null);
  const missions = missionCatalog().map((m) => {
    const hits = rows.filter((r) => r.kind === "mission" && r.side === m.side && idOf(r.ref) === m.id);
    return { ...m, claims: hits.length, week: hits.filter((r) => r.created_at >= weekAgo).length, people: new Set(hits.map((r) => r.user_id)).size, credits: hits.reduce((t, r) => t + r.amount, 0) };
  });

  const byUser = new Map<string, Row[]>();
  for (const r of rows) (byUser.get(`${r.user_id}|${r.side}`) ?? byUser.set(`${r.user_id}|${r.side}`, []).get(`${r.user_id}|${r.side}`)!).push(r);
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const page = (await (await supabaseRest(`app_users?id=in.(${ids.slice(i, i + 150).join(",")})&select=id,display_name,tiktok_username,email`)).json()) as { id: string; display_name: string | null; tiktok_username: string | null; email: string | null }[];
    for (const u of page) names.set(u.id, u.tiktok_username ? `@${u.tiktok_username}` : u.display_name ?? u.email?.split("@")[0] ?? "Someone");
  }
  const starters = missionCatalog().filter((m) => m.kind !== "Daily");
  const people = [...byUser.entries()].map(([key, list]) => {
    const [userId, side] = key.split("|");
    const once = new Set(list.filter((r) => r.ref.startsWith("o:")).map((r) => r.ref.slice(2)));
    const mine = starters.filter((m) => m.side === side);
    return {
      name: names.get(userId) ?? "Someone", side,
      starters: [mine.filter((m) => once.has(m.id)).length, mine.length] as [number, number],
      dailyWeek: list.filter((r) => r.ref.startsWith("d:") && r.created_at >= weekAgo).length,
      credits: list.reduce((t, r) => t + r.amount, 0),
      last: list[0]?.created_at ?? null,
      missing: mine.filter((m) => !once.has(m.id)).map((m) => m.title),
    };
  }).sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  return { missions, people };
}
