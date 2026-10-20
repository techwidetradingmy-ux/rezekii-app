import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getUserPost } from "../posting/store.ts";
import { cleanRecipe, recipeFromPosts, type Recipe } from "./recipe.ts";
import type { SocialPostRow } from "./store.ts";

const UUID = /^[0-9a-f-]{36}$/;

/** The social posts of one New post (its group), or none when the key isn't this user's. */
async function groupRows(userId: string, key: string): Promise<SocialPostRow[]> {
  if (!UUID.test(key)) return [];
  return (await supabaseRest(`social_posts?group_id=eq.${key}&user_id=eq.${userId}&order=created_at`)).json();
}

/** Keeps what was typed in New post with the post (M7). Only for a post of this user. */
export async function saveRecipe(userId: string, key: string, raw: unknown): Promise<boolean> {
  const recipe = cleanRecipe(raw);
  if (!recipe || !UUID.test(key)) return false;
  if (!(await groupRows(userId, key)).length && !(await getUserPost(userId, key))) return false;
  const r = await supabaseRest("post_recipes?on_conflict=post_key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ post_key: key, user_id: userId, recipe }),
  });
  return r.ok;
}

/**
 * What Reuse fills New post in with: the saved recipe, or for older posts each app's caption, comment and settings as they
 * went out. `at` is when the post went out (or was due), for the note in New post.
 */
export async function loadRecipe(userId: string, key: string): Promise<{ recipe: Recipe; at: string | null } | null> {
  if (!UUID.test(key)) return null;
  const [[saved], social] = await Promise.all([
    supabaseRest(`post_recipes?post_key=eq.${key}&user_id=eq.${userId}&select=recipe`).then((r) => r.json() as Promise<{ recipe: unknown }[]>),
    groupRows(userId, key),
  ]);
  const tiktokId = social.find((s) => s.tiktok_post_id)?.tiktok_post_id ?? (social.length ? null : key);
  const tiktok = tiktokId ? await getUserPost(userId, tiktokId) : null;
  if (!social.length && !tiktok) return null;
  const at = social[0]?.posted_at ?? social[0]?.scheduled_at ?? tiktok?.posted_at ?? tiktok?.scheduled_at ?? null;
  const recipe = (saved && cleanRecipe(saved.recipe)) || recipeFromPosts(social, tiktok);
  return { recipe, at };
}
