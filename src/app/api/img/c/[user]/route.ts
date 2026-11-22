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
  const [u] = (await (await supabaseRest(`app_users?tiktok_username=eq.${encodeURIComponent(user)}&select=id,avatar_url&limit=1`)).json()) as { id: string; avatar_url: string | null }[];
  const url = freshUrl(u?.avatar_url, Date.now(), 60_000);
  if (url) return (await saveAndServe(user, url)) ?? new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=300" } });
  // Her own photo has expired (owner, 22 Nov 2026: it showed blank): one of the TikTok accounts she connected for posting.
  if (!u) return noImage();
  const conns = (await (await supabaseRest(`tiktok_connections?user_id=eq.${u.id}&select=username,avatar_url&order=connected_at.desc`)).json().catch(() => [])) as { username: string | null; avatar_url: string | null }[];
  for (const c of conns) {
    const copy = c.username && c.username.toLowerCase() !== user.toLowerCase() ? await readCreatorPhoto(c.username) : null;
    if (copy) return copy;
  }
  for (const c of conns) {
    const live = freshUrl(c.avatar_url, Date.now(), 60_000);
    const copy = live ? await saveAndServe(user, live) : null;
    if (copy) return copy;
  }
  return noImage();
}

/**
 * Saved now and served from Rezekii (owner, 31 Oct 2026): Google photos refuse to show on other sites, and TikTok's addresses
 * expire, so the photo is copied once instead of linked. Null when it couldn't be saved.
 */
async function saveAndServe(user: string, url: string): Promise<Response | null> {
  if (!(await saveCreatorPhoto(user, url).catch(() => false))) return null;
  return readCreatorPhoto(user);
}
