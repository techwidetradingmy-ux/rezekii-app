import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { freshUrl, noImage, readCreatorPhoto } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

/**
 * A creator's saved TikTok photo (public on TikTok anyway), kept by caches for good (the page's address changes when it does).
 * Not saved yet: a Rezekii creator's own TikTok photo address while it still works, for a few minutes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  if (!/^[a-z0-9._]{1,40}$/i.test(user)) return noImage();
  const saved = await readCreatorPhoto(user);
  if (saved) return saved;
  const [u] = (await (await supabaseRest(`app_users?tiktok_username=eq.${encodeURIComponent(user)}&select=avatar_url&limit=1`)).json()) as { avatar_url: string | null }[];
  const url = freshUrl(u?.avatar_url, Date.now(), 60_000);
  return url ? new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=300" } }) : noImage();
}
