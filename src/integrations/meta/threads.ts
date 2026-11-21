import { MetaError, THREADS_VERSION, metaApp, metaFetch, qs } from "./graph.ts";
import type { ContainerStatus } from "./instagram.ts";

/** Threads API (its own app id and secret inside the Meta app). Tokens last 60 days. */
const TH = (path: string) => `https://graph.threads.net/${THREADS_VERSION}/${path}`;
export const THREADS_SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_replies"];
/** Community (Admins, owner 23 Oct 2026): numbers, replies and mentions, keyword search, profile lookup, delete, places. */
export const THREADS_COMMUNITY_SCOPES = [
  ...THREADS_SCOPES, "threads_manage_insights", "threads_read_replies", "threads_manage_mentions", "threads_keyword_search", "threads_profile_discovery",
  "threads_delete", "threads_location_tagging",
];

/** Meta's second review (owner, 12 Nov 2026): Threads numbers and reading replies on top of what everyone has. */
export const THREADS_INSIGHTS_SCOPES = [...THREADS_SCOPES, "threads_manage_insights", "threads_read_replies"];

export function threadsAuthUrl(state: string, redirectUri: string, level: "basic" | "insights" | "community" = "basic"): string {
  const scope = { basic: THREADS_SCOPES, insights: THREADS_INSIGHTS_SCOPES, community: THREADS_COMMUNITY_SCOPES }[level].join(",");
  const q = new URLSearchParams({ client_id: metaApp("threads").id, redirect_uri: redirectUri, scope, response_type: "code", state });
  return `https://threads.net/oauth/authorize?${q}`;
}

/** The code → a long-lived token (60 days). */
export async function exchangeThreadsCode(code: string, redirectUri: string): Promise<{ token: string; expiresIn: number }> {
  const { id, secret } = metaApp("threads");
  const short = await metaFetch<{ access_token: string }>("https://graph.threads.net/oauth/access_token", { client_id: id, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
  const long = await metaFetch<{ access_token: string; expires_in: number }>(`https://graph.threads.net/access_token?${qs({ grant_type: "th_exchange_token", client_secret: secret, access_token: short.access_token })}`);
  return { token: long.access_token, expiresIn: long.expires_in };
}
export async function refreshThreadsToken(token: string): Promise<{ token: string; expiresIn: number }> {
  const r = await metaFetch<{ access_token: string; expires_in: number }>(`https://graph.threads.net/refresh_access_token?${qs({ grant_type: "th_refresh_token", access_token: token })}`);
  return { token: r.access_token, expiresIn: r.expires_in };
}

export type ThreadsProfile = { id: string; username: string; name?: string; threads_profile_picture_url?: string };
export const threadsProfile = (token: string) => metaFetch<ThreadsProfile>(TH(`me?${qs({ fields: "id,username,name,threads_profile_picture_url", access_token: token })}`));

/** A video post container; Threads processes the video before it can be published. */
export async function createThreadsVideo(userId: string, token: string, videoUrl: string, text: string, o: { replies?: string; topic?: string } = {}): Promise<string> {
  const form: Record<string, string> = { media_type: "VIDEO", video_url: videoUrl, text, access_token: token };
  if (o.replies && o.replies !== "everyone") form.reply_control = o.replies;
  if (o.topic) form.topic_tag = o.topic;
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), form)).id;
}
/** A photo post container: one photo (IMAGE), or a carousel of 2 to 20 (each photo its own item container first). */
export async function createThreadsPhotos(userId: string, token: string, photoUrls: string[], text: string, o: { replies?: string; topic?: string } = {}): Promise<string> {
  const extra: Record<string, string> = {};
  if (o.replies && o.replies !== "everyone") extra.reply_control = o.replies;
  if (o.topic) extra.topic_tag = o.topic;
  if (photoUrls.length === 1) return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), { media_type: "IMAGE", image_url: photoUrls[0], text, ...extra, access_token: token })).id;
  const children: string[] = [];
  for (const url of photoUrls) children.push((await metaFetch<{ id: string }>(TH(`${userId}/threads`), { media_type: "IMAGE", image_url: url, is_carousel_item: "true", access_token: token })).id);
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), { media_type: "CAROUSEL", children: children.join(","), text, ...extra, access_token: token })).id;
}
/** The first comment: the account's own reply under its post, with an image when there is one. */
export async function createThreadsReply(userId: string, token: string, text: string, replyToId: string, imageUrl?: string | null): Promise<string> {
  const form: Record<string, string> = imageUrl ? { media_type: "IMAGE", image_url: imageUrl } : { media_type: "TEXT" };
  if (text) form.text = text;
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), { ...form, reply_to_id: replyToId, access_token: token })).id;
}
export const threadsContainer = (id: string, token: string) => metaFetch<{ status?: ContainerStatus; error_message?: string }>(TH(`${id}?${qs({ fields: "status,error_message", access_token: token })}`));
export async function publishThreads(userId: string, token: string, containerId: string): Promise<string> {
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads_publish`), { creation_id: containerId, access_token: token })).id;
}
export const threadsPermalink = async (mediaId: string, token: string) => (await metaFetch<{ permalink?: string }>(TH(`${mediaId}?${qs({ fields: "permalink", access_token: token })}`))).permalink ?? null;

/** Whether a post still exists (false once it was deleted in the app); other errors are thrown. */
export async function threadsPostExists(id: string, token: string): Promise<boolean> {
  try {
    await metaFetch(TH(`${id}?${qs({ fields: "id", access_token: token })}`));
    return true;
  } catch (err) {
    if (err instanceof MetaError && err.gone) return false;
    throw err;
  }
}
