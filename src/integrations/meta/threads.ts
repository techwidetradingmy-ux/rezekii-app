import { THREADS_VERSION, metaApp, metaFetch, qs } from "./graph.ts";
import type { ContainerStatus } from "./instagram.ts";

/** Threads API (its own app id and secret inside the Meta app). Tokens last 60 days. */
const TH = (path: string) => `https://graph.threads.net/${THREADS_VERSION}/${path}`;
export const THREADS_SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_replies"];

export function threadsAuthUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_id: metaApp("threads").id, redirect_uri: redirectUri, scope: THREADS_SCOPES.join(","), response_type: "code", state });
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
export async function createThreadsVideo(userId: string, token: string, videoUrl: string, text: string): Promise<string> {
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), { media_type: "VIDEO", video_url: videoUrl, text, access_token: token })).id;
}
/** The first comment: the account's own reply under its post. */
export async function createThreadsReply(userId: string, token: string, text: string, replyToId: string): Promise<string> {
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads`), { media_type: "TEXT", text, reply_to_id: replyToId, access_token: token })).id;
}
export const threadsContainer = (id: string, token: string) => metaFetch<{ status?: ContainerStatus; error_message?: string }>(TH(`${id}?${qs({ fields: "status,error_message", access_token: token })}`));
export async function publishThreads(userId: string, token: string, containerId: string): Promise<string> {
  return (await metaFetch<{ id: string }>(TH(`${userId}/threads_publish`), { creation_id: containerId, access_token: token })).id;
}
export const threadsPermalink = async (mediaId: string, token: string) => (await metaFetch<{ permalink?: string }>(TH(`${mediaId}?${qs({ fields: "permalink", access_token: token })}`))).permalink ?? null;
