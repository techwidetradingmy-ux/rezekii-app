import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { IDEAS_FOR, marketIdeas, showcaseIdeas, type Channel, type TodayIdeas } from "./today.ts";

/**
 * Today's Ideas saved per creator and view (owner, 1 Nov 2026): the daily refresh prepares each creator's main lists ahead, and
 * the page shows the saved list at once until TikTok publishes its next daily list (or her level changes).
 */
type Level = keyof typeof IDEAS_FOR;
export const ideasKey = (source: "market" | "showcase", channel: Channel, cat: string | null) => `${source}:${channel}:${cat ?? ""}`;

export async function savedIdeas(userId: string, key: string): Promise<{ day: string | null; level: Level | null; data: TodayIdeas } | null> {
  const [row] = (await (await supabaseRest(`ideas_cache?user_id=eq.${userId}&key=eq.${encodeURIComponent(key)}&select=day,data&limit=1`)).json().catch(() => [])) as { day: string | null; data: TodayIdeas & { level?: Level } }[];
  return row ? { day: row.day, level: row.data.level ?? null, data: row.data } : null;
}

/** Makes one view of her ideas now and saves it. */
export async function ideasFor(userId: string, token: string, level: Level, source: "market" | "showcase", channel: Channel, cat: string | null): Promise<TodayIdeas> {
  const want = IDEAS_FOR[level] ?? IDEAS_FOR.bronze;
  const r = source === "showcase" ? await showcaseIdeas(token, want, channel) : await marketIdeas(token, want, channel, cat);
  await supabaseRest("ideas_cache?on_conflict=user_id,key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, key: ideasKey(source, channel, cat), day: r.day, data: { ...r, level }, at: new Date().toISOString() }),
  }).catch(() => undefined);
  return r;
}
