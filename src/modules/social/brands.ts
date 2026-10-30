import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { userTikTokAccounts } from "../posting/store.ts";
import { listAccounts } from "./accounts.ts";
import { tiktokKey } from "./picker.ts";

/** A named group of channels posted to together (B1–B8). A channel is a social account id or "tiktok:<open_id>". */
export type Brand = { id: string; name: string; channels: string[] };
const COLS = "id,name,channels";
const DUPLICATE: { error: string } = { error: "You already have a brand with this name." };

/** The owner's own channels as channel keys: only these can go in a brand. */
export async function myChannelKeys(userId: string): Promise<Set<string>> {
  const [social, tiktok] = await Promise.all([listAccounts(userId), userTikTokAccounts(userId)]);
  return new Set([...social.map((a) => a.id), ...tiktok.map((a) => tiktokKey(a.open_id))]);
}

export async function listBrands(userId: string): Promise<Brand[]> {
  return (await supabaseRest(`social_brands?user_id=eq.${userId}&select=${COLS}&order=name`)).json();
}

export async function countBrands(userId: string): Promise<number> {
  return ((await (await supabaseRest(`social_brands?user_id=eq.${userId}&select=id`)).json()) as unknown[]).length;
}

/** Creates a brand, or updates one of the owner's own (by id). */
export async function saveBrand(userId: string, b: { id?: string; name: string; channels: string[] }): Promise<Brand | { error: string }> {
  try {
    const res = b.id
      ? await supabaseRest(`social_brands?id=eq.${b.id}&user_id=eq.${userId}&select=${COLS}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: b.name, channels: b.channels, updated_at: new Date().toISOString() }) })
      : await supabaseRest(`social_brands?select=${COLS}`, { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, name: b.name, channels: b.channels }) });
    const [row] = (await res.json()) as Brand[];
    return row ?? { error: "That brand doesn't exist." };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Supabase 409")) return DUPLICATE;
    throw err;
  }
}

export async function deleteBrand(userId: string, id: string): Promise<boolean> {
  const res = await supabaseRest(`social_brands?id=eq.${id}&user_id=eq.${userId}&select=id`, { method: "DELETE", headers: { prefer: "return=representation" } });
  return ((await res.json()) as unknown[]).length > 0;
}

type Row = { group_id: string; account_id: string | null; shopee_connection_id: string | null; tiktok_post_id: string | null; created_at: string };

/**
 * The channels of the owner's most recent post (Same as last post, B7): a New post's Meta and Shopee channels plus its TikTok
 * account, or a TikTok-only post when that came later. Nothing extra is stored; it's read from past posts.
 */
export async function lastPostChannels(userId: string): Promise<string[]> {
  const get = async <T,>(q: string) => (await (await supabaseRest(q)).json()) as T[];
  const [[s], [t]] = await Promise.all([
    get<Row>(`social_posts?user_id=eq.${userId}&select=group_id,created_at&order=created_at.desc&limit=1`),
    get<{ tiktok_open_id: string; created_at: string }>(`posts?user_id=eq.${userId}&select=tiktok_open_id,created_at&order=created_at.desc&limit=1`),
  ]);
  if (!s) return t ? [tiktokKey(t.tiktok_open_id)] : [];
  // A New post saves its TikTok post first, so a TikTok post newer than the last Meta channels was posted on its own.
  if (t && t.created_at > s.created_at) return [tiktokKey(t.tiktok_open_id)];
  const rows = await get<Row>(`social_posts?group_id=eq.${s.group_id}&user_id=eq.${userId}&select=account_id,shopee_connection_id,tiktok_post_id`);
  const keys = rows.map((r) => r.account_id ?? (r.shopee_connection_id ? `shopee:${r.shopee_connection_id}` : null)).filter((k): k is string => !!k);
  const ttId = rows.find((r) => r.tiktok_post_id)?.tiktok_post_id;
  if (ttId) {
    const [p] = await get<{ tiktok_open_id: string }>(`posts?id=eq.${ttId}&select=tiktok_open_id`);
    if (p) keys.unshift(tiktokKey(p.tiktok_open_id));
  }
  return [...new Set(keys)];
}
