import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { BUCKET, storage } from "../posting/media.ts";
import type { Platform } from "./rules.ts";

/** "removed": it was posted, then deleted in the app (found by the timer, P11). */
export type SocialStatus = "draft" | "scheduled" | "publishing" | "processing" | "posted" | "failed" | "cancelled" | "removed";
export type SocialPostRow = {
  id: string;
  group_id: string;
  tiktok_post_id: string | null;
  user_id: string;
  account_id: string | null;
  /** A Shopee channel post's account (shopee_connections); account_id is for Facebook, Instagram and Threads. */
  shopee_connection_id: string | null;
  account_name: string | null;
  platform: Platform | "shopee";
  source: "upload" | "link";
  storage_path: string | null;
  link_url: string | null;
  duration_sec: number | null;
  caption: string;
  first_comment: string;
  /** One image under the first comment (Facebook and Threads only). */
  comment_image_path: string | null;
  status: SocialStatus;
  scheduled_at: string | null;
  next_attempt_at: string | null;
  attempts: number;
  container_id: string | null;
  external_post_id: string | null;
  permalink: string | null;
  comment_status: "none" | "pending" | "posted" | "failed";
  comment_id: string | null;
  comment_error: string | null;
  last_error: string | null;
  posted_at: string | null;
  /** Post settings for this channel (settings.ts): Facebook draft, Instagram feed/collaborators/trial, Threads replies/topic; Shopee product, duet, stitch, AI label. */
  settings: Record<string, unknown>;
  live_checked_at: string | null;
  created_at: string;
};
export type NewSocialPost = Omit<SocialPostRow, "id" | "created_at" | "live_checked_at" | "attempts" | "container_id" | "external_post_id" | "permalink" | "comment_status" | "comment_id" | "comment_error" | "last_error" | "posted_at">;

const post = (body: unknown, prefer = "return=representation"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });
const FINAL = new Set<SocialStatus>(["posted", "failed", "cancelled", "removed"]);

export async function insertSocialPosts(rows: NewSocialPost[]): Promise<SocialPostRow[]> {
  return (await supabaseRest("social_posts", post(rows))).json();
}

export async function updateSocialPost(id: string, patch: Partial<SocialPostRow>): Promise<void> {
  await supabaseRest(`social_posts?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
}

/** The signed-in account's channel posts for My posts (cancelled ones left out), newest scheduled first. */
export async function listSocialPosts(userId: string, limit = 150): Promise<SocialPostRow[]> {
  return (await supabaseRest(`social_posts?user_id=eq.${userId}&status=neq.cancelled&order=scheduled_at.desc.nullsfirst,created_at.desc&limit=${limit}`)).json();
}

export async function getUserSocialPost(userId: string, id: string): Promise<SocialPostRow | null> {
  const [row] = (await (await supabaseRest(`social_posts?id=eq.${id}&user_id=eq.${userId}&limit=1`)).json()) as SocialPostRow[];
  return row ?? null;
}

/** Due channel posts, handed to this run only (marked publishing, try +1). */
export async function claimDueSocialPosts(max: number): Promise<SocialPostRow[]> {
  return (await supabaseRest("rpc/claim_due_social_posts", post({ max_posts: max }))).json();
}
export async function processingSocialPosts(limit: number): Promise<SocialPostRow[]> {
  return (await supabaseRest(`social_posts?status=eq.processing&order=updated_at&limit=${limit}`)).json();
}
export async function pendingComments(limit: number): Promise<SocialPostRow[]> {
  return (await supabaseRest(`social_posts?status=eq.posted&comment_status=eq.pending&order=posted_at&limit=${limit}`)).json();
}

/** How many posts this account has going out in the 24 hours up to `at` (Instagram, Threads and Facebook Reels have daily caps). */
export async function postsInDay(accountId: string, at: Date): Promise<number> {
  const from = new Date(at.getTime() - 86400e3).toISOString();
  const res = await supabaseRest(`social_posts?account_id=eq.${accountId}&status=in.(scheduled,publishing,processing,posted)&scheduled_at=gt.${encodeURIComponent(from)}&scheduled_at=lte.${encodeURIComponent(at.toISOString())}&select=id`);
  return ((await res.json()) as unknown[]).length;
}

/** A copy of the creator's upload for the Meta channels, so TikTok deleting its file after posting never takes it away. */
export async function copyUpload(from: string, to: string): Promise<void> {
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/copy`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: from, destinationKey: to }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`storage copy failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** A link Meta can fetch the video or comment image from (Instagram, Facebook and Threads download it themselves). */
export async function signedMediaUrl(path: string, seconds = 6 * 3600): Promise<string> {
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`storage sign failed: ${res.status}`);
  return `${base}${((await res.json()) as { signedURL: string }).signedURL}`;
}

/**
 * Posts that went out in the last 7 days and weren't checked in the last 10 minutes (P11): the timer asks each app whether
 * they still exist. Facebook drafts aren't public, so they're left out.
 */
export async function postedToCheck(limit: number): Promise<SocialPostRow[]> {
  const week = new Date(Date.now() - 7 * 86400e3).toISOString(), recent = new Date(Date.now() - 10 * 60e3).toISOString();
  const rows = (await (await supabaseRest(`social_posts?status=eq.posted&posted_at=gt.${encodeURIComponent(week)}&or=(live_checked_at.is.null,live_checked_at.lt.${encodeURIComponent(recent)})&order=live_checked_at.asc.nullsfirst&limit=${limit * 2}`)).json()) as SocialPostRow[];
  return rows.filter((r) => !(r.platform === "facebook" && r.settings?.draft === true)).slice(0, limit);
}

/** Whether the stored video is still there (a retry needs it). */
export async function videoStillStored(path: string): Promise<boolean> {
  return signedMediaUrl(path, 60).then(() => true, () => false);
}

/**
 * Once every channel post in the group has finished (and its first comment too), the shared video copy and the comment image
 * are deleted. While a
 * channel has failed it's kept, so Try again works; cancelling or a successful retry lets it go.
 */
export async function cleanUpGroup(groupId: string): Promise<void> {
  const rows = (await (await supabaseRest(`social_posts?group_id=eq.${groupId}&select=status,comment_status,storage_path,comment_image_path`)).json()) as Pick<SocialPostRow, "status" | "comment_status" | "storage_path" | "comment_image_path">[];
  if (!rows.length || rows.some((r) => !FINAL.has(r.status) || r.status === "failed" || r.comment_status === "pending")) return;
  const paths = [rows.find((r) => r.storage_path)?.storage_path, rows.find((r) => r.comment_image_path)?.comment_image_path].filter((p): p is string => !!p);
  const { base, headers } = storage();
  for (const path of paths) await fetch(`${base}/object/${BUCKET}/${path}`, { method: "DELETE", headers, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => {});
}
