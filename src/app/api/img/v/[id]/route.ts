import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { queryVideos } from "@/integrations/tiktok/stats.ts";
import { freshTikTokToken } from "@/modules/posting/store.ts";
import { freshUrl, imageResponse, noImage, readVideoCover, saveVideoCover } from "@/modules/photos/store.ts";
import { productImages } from "@/modules/sales/frames.ts";

export const dynamic = "force-dynamic";

/**
 * A creator's video cover. TikTok's cover addresses stop working within a day, so the first time a cover is shown it is saved
 * (from the daily video list, or asked of TikTok again with the creator's TikTok sign-in) and served from Rezekii after that.
 * Without a cover (the creator's TikTok account isn't connected), the photo of the product the video sold, as on Rankings.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id)) return noImage();
  const saved = await readVideoCover(id);
  if (saved) return saved;
  const user = await currentUser();
  if (!user) return noImage();
  const [row] = (await (await supabaseRest(`tiktok_videos?video_id=eq.${id}&select=cover,open_id&limit=1`)).json()) as { cover: string | null; open_id: string | null }[];
  let url = freshUrl(row?.cover, Date.now(), 60_000);
  if (!url && row?.open_id) {
    const token = await freshTikTokToken(row.open_id).catch(() => null);
    const r = token ? await queryVideos(token, [id]).catch(() => null) : null;
    url = r?.data?.find((v) => v.id === id)?.cover_image_url ?? null;
  }
  const img = url ? await saveVideoCover(id, url) : null;
  if (img) return imageResponse(img.body, img.type);
  // Not saved as the cover, so the real one replaces it once TikTok can give it.
  const [o] = (await (await supabaseRest(`creator_orders?user_id=eq.${user.id}&content_id=eq.${id}&product_id=not.is.null&select=product_id&limit=1`)).json()) as { product_id: string }[];
  const pic = o ? (await productImages(user.id, [o.product_id]).catch(() => null))?.get(o.product_id) : null;
  return pic ? new Response(null, { status: 302, headers: { location: pic, "cache-control": "private, max-age=3600" } }) : noImage();
}
