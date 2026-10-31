import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getCreatorProfile } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "./access.ts";

/**
 * The TikTok Shop profile picture of each Rezekii creator who linked TikTok Shop (owner, 31 Oct 2026: photos come from TikTok
 * Shop only). One call per creator; creators whose link stopped working are skipped.
 */
export async function shopPhotos(usernames: string[]): Promise<{ username: string; url: string }[]> {
  if (!usernames.length) return [];
  const rows = (await (await supabaseRest("affiliate_connections?select=user_id,app_users(tiktok_username)&limit=5000")).json()) as { user_id: string; app_users: { tiktok_username: string | null } | null }[];
  const want = new Set(usernames.map((u) => u.toLowerCase()));
  const out: { username: string; url: string }[] = [];
  for (const r of rows) {
    const username = r.app_users?.tiktok_username?.toLowerCase();
    if (!username || !want.has(username)) continue;
    const token = await approvedCreatorToken(r.user_id).catch(() => null);
    if (!token) continue;
    const p = await getCreatorProfile(token).catch(() => null);
    if (p?.code === 0 && p.data?.avatar?.url) out.push({ username, url: p.data.avatar.url });
  }
  return out;
}
