import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { freshUrl, noImage, readCreatorPhoto, saveCreatorPhoto } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

/**
 * A creator's saved TikTok photo (public on TikTok anyway), kept by caches for good (the page's address changes when it does).
 * Not saved yet: a Rezekii creator's own photo (TikTok or Google sign-in) is saved from its address while that still works.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  if (!/^[a-z0-9._]{1,40}$/i.test(user)) return noImage();
  const saved = await readCreatorPhoto(user);
  if (saved) return saved;
  const [u] = (await (await supabaseRest(`app_users?tiktok_username=eq.${encodeURIComponent(user)}&select=avatar_url&limit=1`)).json()) as { avatar_url: string | null }[];
  const url = freshUrl(u?.avatar_url, Date.now(), 60_000);
  if (!url) return noImage();
  // Saved now and served from Rezekii (owner, 31 Oct 2026): Google photos refuse to show on other sites, and TikTok's
  // addresses expire, so the photo is copied once instead of linked.
  if (await saveCreatorPhoto(user, url).catch(() => false)) {
    const now = await readCreatorPhoto(user);
    if (now) return now;
  }
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=300" } });
}
