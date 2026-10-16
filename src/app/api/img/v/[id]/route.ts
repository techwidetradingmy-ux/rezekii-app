import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { queryVideos } from "@/integrations/tiktok/stats.ts";
import { freshTikTokToken } from "@/modules/posting/store.ts";
import { freshUrl, imageResponse, noImage, readVideoCover, saveVideoCover } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

/**
 * A connected creator's video cover. TikTok's cover addresses stop working within a day, so the first time a cover is shown it
 * is saved (from the daily video list, or asked of TikTok again with the creator's sign-in) and served from Rezekii after that.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id)) return noImage();
  const saved = await readVideoCover(id);
  if (saved) return saved;
  if (!(await currentUser())) return noImage();
  const [row] = (await (await supabaseRest(`tiktok_videos?video_id=eq.${id}&select=cover,open_id&limit=1`)).json()) as { cover: string | null; open_id: string | null }[];
  if (!row) return noImage();
  let url = freshUrl(row.cover, Date.now(), 60_000);
  if (!url && row.open_id) {
    const token = await freshTikTokToken(row.open_id).catch(() => null);
    const r = token ? await queryVideos(token, [id]).catch(() => null) : null;
    url = r?.data?.find((v) => v.id === id)?.cover_image_url ?? null;
  }
  const img = url ? await saveVideoCover(id, url) : null;
  return img ? imageResponse(img.body, img.type) : noImage();
}
