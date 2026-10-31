import { supabaseRest } from "../../integrations/supabase/rest.ts";

/**
 * System notices for everyone (owner, 31 Oct 2026: "if data is late or fails, tell users"): Techwide's own announcements, and an
 * automatic one when the 1:00 AM data update isn't finished by 2:00 AM Malaysia time or part of it failed.
 */
export type Announcement = { id: string; title: string; body: string; level: "info" | "important"; audience: "all" | "creator" | "seller"; starts_at: string; ends_at: string | null; created_by: string | null; created_at: string };
export type SystemNote = { id: string; at: string; title: string; line: string; important: boolean };

const MYT = 8 * 3_600_000;
const day = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
/** The part of the daily update people see (not the best-seller lists or the weekly creator search). */
const CORE = ["tap_campaigns", "tap_products", "tap_catalog", "tap_samples", "tap_samples_mine", "tap_creators", "videos", "orders", "photos", "levels", "agency", "details"];

export async function activeAnnouncements(side: "creator" | "seller" | "all" = "all"): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const who = side === "all" ? "" : `&audience=in.(all,${side})`;
  return (await (await supabaseRest(`announcements?starts_at=lte.${now}&or=(ends_at.is.null,ends_at.gt.${now})${who}&select=*&order=starts_at.desc&limit=10`)).json()) as Announcement[];
}

/** Today's data update: late (not finished by 2:00 AM) or partly failed. Null when it's fine or not due yet. */
export async function dataNotice(now = Date.now()): Promise<SystemNote | null> {
  const today = day(now);
  if (new Date(now + MYT).getUTCHours() < 2) return null;
  const rows = (await (await supabaseRest(`refresh_tasks?run_date=eq.${today}&kind=in.(${CORE.join(",")})&select=status`)).json()) as { status: string }[];
  const at = new Date(Date.parse(`${today}T02:00:00+08:00`)).toISOString();
  if (!rows.length) return { id: `sys:data:${today}:late`, at, title: "Today's data update is late", line: "Rezekii hasn't updated today's TikTok data yet. Numbers may be from yesterday for now.", important: true };
  if (rows.some((r) => r.status === "failed")) return { id: `sys:data:${today}:failed`, at, title: "Some of today's data didn't update", line: "TikTok didn't send part of today's data. Some numbers may be from yesterday; we're on it.", important: true };
  if (rows.some((r) => r.status === "pending" || r.status === "running")) return { id: `sys:data:${today}:late`, at, title: "Today's data update is late", line: "Rezekii is still updating today's TikTok data. Some numbers may be from yesterday until it finishes.", important: true };
  return null;
}

/** Everything under System for one side of the app. */
export async function systemNotes(side: "creator" | "seller"): Promise<SystemNote[]> {
  const [list, data] = await Promise.all([activeAnnouncements(side).catch(() => []), dataNotice().catch(() => null)]);
  return [...(data ? [data] : []), ...list.map((a) => ({ id: `sys:a:${a.id}`, at: a.starts_at, title: a.title, line: a.body, important: a.level === "important" }))];
}
