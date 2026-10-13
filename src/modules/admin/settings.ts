import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { postingTimes } from "../posting/times.ts";
import { listActivity, listAdmins, type Activity, type AdminRow } from "./admins.ts";
import { systemHealth, type Health } from "./health.ts";

export type Job = { name: string; every: string; last: string | null };
export type SettingsData = { admins: AdminRow[]; times: string[]; activity: Activity[]; health: Health; jobs: Job[]; now: number };

const latest = async (path: string, col: string) => ((await (await supabaseRest(path)).json()) as Record<string, string>[])[0]?.[col] ?? null;

/** Everything on the admin Settings page. */
export async function settingsData(): Promise<SettingsData> {
  const [admins, times, activity, health, lastPost, lastTap, lastVideos] = await Promise.all([
    listAdmins(),
    postingTimes(),
    listActivity(),
    systemHealth(),
    latest("posts?status=in.(posted,sent_to_inbox,processing,failed)&select=updated_at&order=updated_at.desc&limit=1", "updated_at"),
    latest("market_snapshots?dataset=eq.tap_products&select=fetched_at&order=fetched_at.desc&limit=1", "fetched_at"),
    latest("tiktok_videos?select=updated_at&order=updated_at.desc&limit=1", "updated_at"),
  ]);
  return {
    admins,
    times,
    activity,
    health,
    jobs: [
      { name: "Publish due posts", every: "Every minute", last: lastPost },
      { name: "Daily data refresh (TAP, best sellers, rankings, levels)", every: "Daily", last: health.refresh.lastAt },
      { name: "TAP products and sample quotas", every: "Daily, with the refresh", last: lastTap },
      { name: "Video stats for connected accounts", every: "Daily, with the refresh", last: lastVideos },
    ],
    now: Date.now(),
  };
}
