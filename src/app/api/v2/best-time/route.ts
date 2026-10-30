import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { linesBetween } from "@/modules/sales/frames.ts";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const SLOTS: [string, number, number][] = [["6–9 AM", 6, 9], ["9–12 PM", 9, 12], ["12–3 PM", 12, 15], ["3–6 PM", 15, 18], ["6–9 PM", 18, 21], ["9 PM–12 AM", 21, 24], ["12–6 AM", 0, 6]];
const slotOf = (iso: string) => { const h = new Date(Date.parse(iso) + 8 * 3_600_000).getUTCHours(); return SLOTS.findIndex(([, a, b]) => h >= a && h < b); };

/**
 * Best time to post, from her own data (owner, 31 Oct 2026): the average views of her TikTok videos by the Malaysia time they
 * were posted (last 60 days). With fewer than 5 videos, when her buyers ordered instead (last 30 days).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const conns = (await (await supabaseRest(`tiktok_connections?user_id=eq.${user.id}&select=open_id`)).json()) as { open_id: string }[];
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const videos = conns.length
    ? ((await (await supabaseRest(`tiktok_videos?open_id=in.(${conns.map((c) => `"${c.open_id}"`).join(",")})&created_at=gte.${encodeURIComponent(since)}&select=created_at,views&limit=2000`)).json()) as { created_at: string; views: number | null }[]).filter((v) => v.views !== null)
    : [];
  if (videos.length >= 5) {
    const sum = SLOTS.map(() => [0, 0]);
    for (const v of videos) { const i = slotOf(v.created_at); if (i >= 0) { sum[i][0] += v.views ?? 0; sum[i][1] += 1; } }
    return NextResponse.json({ basis: "views", count: videos.length, slots: SLOTS.map(([label], i) => [label, sum[i][1] ? Math.round(sum[i][0] / sum[i][1]) : 0]) });
  }
  const lines = await linesBetween(user.id, Date.now() - 30 * DAY, Date.now()).catch(() => []);
  const orders = SLOTS.map(() => new Set<string>());
  for (const l of lines) { const i = slotOf(l.created_at); if (i >= 0) orders[i].add(l.order_id); }
  return NextResponse.json({ basis: "orders", count: new Set(lines.map((l) => l.order_id)).size, slots: SLOTS.map(([label], i) => [label, orders[i].size]) });
}
