import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { orderLines, summarize, techwideCampaigns, type SalesSummary, type Source } from "./summary.ts";

export const PERIODS = [7, 30, 90, 0] as const; // 0 = this month
export const SOURCES: Source[] = ["all", "techwide", "other"];
export type SalesPageData = {
  /** One summary per period and source, keyed "30|all", so switching is instant. */
  summaries: Record<string, SalesSummary>;
  /** Titles and covers for the creator's own videos that made sales (when TikTok is connected and the daily video job has them). */
  videos: Record<string, { title: string; cover: string | null; url: string | null }>;
  monthDays: number;
  now: number;
};

const MYT = 8 * 3600_000;

/** Everything the Sales page shows for one creator, from their saved TikTok Shop affiliate orders. */
export async function salesPage(userId: string, now = Date.now()): Promise<SalesPageData> {
  const monthDays = Number(new Date(now + MYT).toISOString().slice(8, 10));
  const [lines, techwide] = await Promise.all([orderLines(userId, 90, now), techwideCampaigns()]);
  const summaries: Record<string, SalesSummary> = {};
  for (const p of PERIODS) for (const s of SOURCES) summaries[`${p}|${s}`] = summarize(lines, p || monthDays, now, techwide, s);
  const ids = [...new Set(Object.values(summaries).flatMap((x) => x.content.map((c) => c.id)))].filter((id) => /^\d{5,25}$/.test(id));
  const videos: SalesPageData["videos"] = {};
  if (ids.length) {
    const rows = (await (await supabaseRest(`tiktok_videos?video_id=in.(${ids.join(",")})&select=video_id,title,cover,share_url`)).json()) as { video_id: string; title: string | null; cover: string | null; share_url: string | null }[];
    for (const r of rows) videos[r.video_id] = { title: r.title || "Untitled video", cover: r.cover, url: r.share_url };
  }
  return { summaries, videos, monthDays, now };
}
