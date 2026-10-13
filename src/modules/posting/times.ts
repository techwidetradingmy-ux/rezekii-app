import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { RECOMMENDED_HOURS } from "./rules.ts";

/** "06:00" etc. from Settings · Posting times (Malaysia time); the built-in 6 AM, 12 PM and 8 PM until an admin changes them. */
export async function postingTimes(): Promise<string[]> {
  const [row] = (await (await supabaseRest("app_settings?key=eq.posting_times&select=value&limit=1")).json()) as { value: string[] }[];
  const list = Array.isArray(row?.value) ? row.value.filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) : [];
  return list.length ? [...new Set(list)].sort() : RECOMMENDED_HOURS.map((h) => `${String(h).padStart(2, "0")}:00`);
}

/** The same times as hours of the day (9:30 → 9.5), for picking the next recommended slot. */
export const postingHours = async () => (await postingTimes()).map((t) => Number(t.slice(0, 2)) + Number(t.slice(3)) / 60);

export async function savePostingTimes(times: string[], userId: string): Promise<void> {
  await supabaseRest("app_settings?on_conflict=key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "posting_times", value: [...new Set(times)].sort(), updated_at: new Date().toISOString(), updated_by: userId }),
  });
}
