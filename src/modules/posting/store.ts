import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { refreshTikTokToken } from "../../integrations/tiktok/login.ts";
import type { PrivacyLevel } from "../../integrations/tiktok/posting.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";
import type { PostChoice } from "./rules.ts";

export type PostStatus = "draft" | "scheduled" | "publishing" | "processing" | "posted" | "sent_to_inbox" | "failed" | "cancelled";

export type PostRow = {
  id: string;
  user_id: string;
  tiktok_open_id: string;
  mode: "direct" | "inbox";
  source: "upload" | "link";
  storage_path: string | null;
  link_url: string | null;
  video_size: number | null;
  duration_sec: number | null;
  caption: string;
  privacy_level: PrivacyLevel | null;
  allow_comments: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  brand_organic: boolean;
  branded_content: boolean;
  is_aigc: boolean;
  status: PostStatus;
  scheduled_at: string | null;
  next_attempt_at: string | null;
  attempts: number;
  publish_id: string | null;
  tiktok_post_id: string | null;
  last_error: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const choiceFromRow = (p: PostRow): PostChoice => ({
  mode: p.mode,
  caption: p.caption,
  privacyLevel: p.privacy_level,
  allowComments: p.allow_comments,
  allowDuet: p.allow_duet,
  allowStitch: p.allow_stitch,
  promo: p.brand_organic || p.branded_content,
  brandOrganic: p.brand_organic,
  brandedContent: p.branded_content,
  isAigc: p.is_aigc,
  durationSec: p.duration_sec,
});

const json = (body: unknown, prefer = "return=representation"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });

export async function insertPost(row: Omit<Partial<PostRow>, "id" | "created_at" | "updated_at"> & Pick<PostRow, "user_id" | "tiktok_open_id" | "source">): Promise<PostRow> {
  const res = await supabaseRest("posts", json(row));
  return ((await res.json()) as PostRow[])[0];
}

export async function updatePost(id: string, patch: Partial<PostRow>): Promise<void> {
  await supabaseRest(`posts?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
}

export async function listPosts(userId: string, limit = 100): Promise<PostRow[]> {
  const res = await supabaseRest(`posts?user_id=eq.${userId}&status=neq.cancelled&order=scheduled_at.desc.nullsfirst,created_at.desc&limit=${limit}`);
  return res.json();
}

export async function getUserPost(userId: string, id: string): Promise<PostRow | null> {
  const res = await supabaseRest(`posts?id=eq.${id}&user_id=eq.${userId}&limit=1`);
  return ((await res.json()) as PostRow[])[0] ?? null;
}

/** This account's scheduled times, so "use recommended time" picks a free one. */
export async function scheduledTimes(openId: string): Promise<Date[]> {
  const res = await supabaseRest(`posts?tiktok_open_id=eq.${openId}&status=in.(scheduled,publishing)&select=scheduled_at`);
  return ((await res.json()) as { scheduled_at: string | null }[]).filter((r) => r.scheduled_at).map((r) => new Date(r.scheduled_at as string));
}

/** Due posts, handed to this run only (marked publishing, try count +1). */
export async function claimDuePosts(max: number): Promise<PostRow[]> {
  const res = await supabaseRest("rpc/claim_due_posts", json({ max_posts: max }, "return=representation"));
  return res.json();
}

export async function processingPosts(limit: number): Promise<PostRow[]> {
  const res = await supabaseRest(`posts?status=eq.processing&order=updated_at&limit=${limit}`);
  return res.json();
}

/** True when `token` is the posting timer's token (kept in Supabase Vault; the app never stores it). */
export async function isTimerToken(token: string): Promise<boolean> {
  if (!token) return false;
  const res = await supabaseRest("rpc/check_posts_timer_token", json({ token }));
  return (await res.json()) === true;
}

/** The account's TikTok access token, refreshed (and saved) when it expires within 10 minutes. */
export async function freshTikTokToken(openId: string): Promise<string> {
  const res = await supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(openId)}&select=access_token_enc,access_token_expires_at,refresh_token_enc&limit=1`);
  const [row] = (await res.json()) as { access_token_enc: string; access_token_expires_at: string; refresh_token_enc: string }[];
  if (!row) throw new Error("This TikTok account isn't connected to Rezekii any more. Continue with TikTok again.");
  if (new Date(row.access_token_expires_at).getTime() > Date.now() + 10 * 60e3) return decryptToken(row.access_token_enc);
  const t = await refreshTikTokToken(decryptToken(row.refresh_token_enc));
  if (!t.access_token || !t.refresh_token || !t.expires_in || !t.refresh_expires_in) throw new Error(`TikTok didn't renew the sign-in (${t.error ?? "no token"}). Continue with TikTok again.`);
  await supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(openId)}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      access_token_enc: encryptToken(t.access_token),
      access_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      refresh_token_enc: encryptToken(t.refresh_token),
      refresh_token_expires_at: new Date(Date.now() + t.refresh_expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return t.access_token;
}

/**
 * The signed-in account's TikTok connection to post with: `requested` when it is one of theirs (admins can hold several
 * Techwide team accounts), otherwise their most recent one.
 */
export async function userTikTokOpenId(userId: string, requested?: string | null): Promise<string | null> {
  const filter = requested ? `&open_id=eq.${encodeURIComponent(requested)}` : "";
  const res = await supabaseRest(`tiktok_connections?user_id=eq.${userId}${filter}&select=open_id&order=updated_at.desc&limit=1`);
  return ((await res.json()) as { open_id: string }[])[0]?.open_id ?? null;
}

/** Every TikTok account the user has connected (one for creators; admins may have several team accounts). */
export async function userTikTokAccounts(userId: string): Promise<{ open_id: string; username: string | null; avatar_url: string | null }[]> {
  return (await supabaseRest(`tiktok_connections?user_id=eq.${userId}&select=open_id,username,avatar_url&order=connected_at`)).json();
}

/** TikTok video ids of the account's posts that went out through Rezekii (only public posts get one), newest first. */
export async function postedVideoIds(userId: string): Promise<{ id: string; tiktok_post_id: string }[]> {
  const res = await supabaseRest(`posts?user_id=eq.${userId}&status=eq.posted&tiktok_post_id=not.is.null&select=id,tiktok_post_id&order=posted_at.desc&limit=20`);
  return res.json();
}
