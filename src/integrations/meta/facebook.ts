import { MetaError, GRAPH_VERSION, metaApp, metaFetch, qs } from "./graph.ts";

/** Facebook Pages (Facebook Login for Business). Page tokens made from a long-lived user token don't expire. */
const G = (path: string) => `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
export const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_engagement", "business_management"];

/** Facebook Login for Business uses a saved configuration (META_FB_CONFIG_ID) for its permissions; plain scopes otherwise. */
export function facebookAuthUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_id: metaApp("facebook").id, redirect_uri: redirectUri, state, response_type: "code" });
  if (process.env.META_FB_CONFIG_ID) q.set("config_id", process.env.META_FB_CONFIG_ID);
  else q.set("scope", FACEBOOK_SCOPES.join(","));
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${q}`;
}

/** The code → a long-lived user token (about 60 days), which the Page tokens come from. */
export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<string> {
  const { id, secret } = metaApp("facebook");
  const short = await metaFetch<{ access_token: string }>(G(`oauth/access_token?${qs({ client_id: id, client_secret: secret, redirect_uri: redirectUri, code })}`));
  const long = await metaFetch<{ access_token: string }>(G(`oauth/access_token?${qs({ grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: short.access_token })}`));
  return long.access_token;
}

export type FacebookPage = { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } };
/** The Pages the person ticked on Facebook's own screen, each with its Page token. */
export async function facebookPages(userToken: string): Promise<FacebookPage[]> {
  const r = await metaFetch<{ data?: FacebookPage[] }>(G(`me/accounts?${qs({ fields: "id,name,access_token,picture{url}", limit: "100", access_token: userToken })}`));
  return r.data ?? [];
}

/** A Page's current profile picture link (Facebook's links expire after a few days). */
export async function facebookPicture(pageId: string, pageToken: string): Promise<string | null> {
  const r = await metaFetch<{ picture?: { data?: { url?: string } } }>(G(`${pageId}?${qs({ fields: "picture{url}", access_token: pageToken })}`));
  return r.picture?.data?.url ?? null;
}

/** Reels (vertical, 3–90 s): start, let Facebook fetch the video from our signed link, then publish with the caption. */
export async function startFacebookReel(pageId: string, token: string): Promise<string> {
  return (await metaFetch<{ video_id: string }>(G(`${pageId}/video_reels`), { upload_phase: "start", access_token: token })).video_id;
}
export async function uploadFacebookReel(videoId: string, token: string, fileUrl: string): Promise<void> {
  const res = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${videoId}`, {
    method: "POST",
    headers: { authorization: `OAuth ${token}`, file_url: fileUrl },
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; debug_info?: { message?: string } };
  if (!res.ok || body.success === false) throw new Error(`Facebook couldn't fetch the video (${body.debug_info?.message ?? `HTTP ${res.status}`}).`);
}
export async function finishFacebookReel(pageId: string, token: string, videoId: string, description: string, draft = false): Promise<void> {
  // DRAFT keeps the Reel in the Page's drafts (Facebook / Meta Business Suite) until someone publishes it there.
  await metaFetch(G(`${pageId}/video_reels`), { upload_phase: "finish", video_id: videoId, video_state: draft ? "DRAFT" : "PUBLISHED", description, access_token: token });
}

/** Longer or non-vertical videos: a Page video post, fetched by Facebook from our signed link. */
export async function postFacebookVideo(pageId: string, token: string, fileUrl: string, description: string): Promise<string> {
  return (await metaFetch<{ id: string }>(G(`${pageId}/videos`), { file_url: fileUrl, description, access_token: token }, 120_000)).id;
}

export type FacebookVideo = { status?: { video_status?: string; processing_phase?: { status?: string }; publishing_phase?: { status?: string; errors?: { message?: string }[] } }; permalink_url?: string; post_id?: string };
export const facebookVideo = (videoId: string, token: string) => metaFetch<FacebookVideo>(G(`${videoId}?${qs({ fields: "status,permalink_url,post_id", access_token: token })}`));

/** A comment by the Page on its own post or video. */
export async function commentOnFacebook(objectId: string, token: string, message: string): Promise<string> {
  return (await metaFetch<{ id: string }>(G(`${objectId}/comments`), { message, access_token: token })).id;
}

export const facebookPermalink = (p?: string) => (!p ? null : p.startsWith("http") ? p : `https://www.facebook.com${p}`);

/** Whether a post still exists (false once it was deleted in the app); other errors are thrown. */
export async function facebookPostExists(id: string, token: string): Promise<boolean> {
  try {
    await metaFetch(G(`${id}?${qs({ fields: "id", access_token: token })}`));
    return true;
  } catch (err) {
    if (err instanceof MetaError && err.gone) return false;
    throw err;
  }
}

/** A Page's ID and name from its ID or username (for mentioning it); Facebook may refuse Pages the app doesn't manage. */
export async function facebookPageInfo(idOrUsername: string, token: string): Promise<{ id: string; name: string }> {
  return metaFetch<{ id: string; name: string }>(G(`${encodeURIComponent(idOrUsername)}?${qs({ fields: "id,name", access_token: token })}`));
}
