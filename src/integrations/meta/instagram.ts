import { GRAPH_VERSION, metaApp, metaFetch, qs } from "./graph.ts";

/** Instagram API with Instagram Login (Business and Creator accounts; no Facebook Page needed). Tokens last 60 days. */
const IG = (path: string) => `https://graph.instagram.com/${GRAPH_VERSION}/${path}`;
export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_comments"];

export function instagramAuthUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_id: metaApp("instagram").id, redirect_uri: redirectUri, response_type: "code", scope: INSTAGRAM_SCOPES.join(","), state, force_reauth: "true" });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

export type InstagramToken = { token: string; expiresIn: number };
/** The code → a long-lived token (60 days). */
export async function exchangeInstagramCode(code: string, redirectUri: string): Promise<InstagramToken> {
  const { id, secret } = metaApp("instagram");
  const reply = await metaFetch<{ access_token?: string; data?: { access_token: string }[] }>("https://api.instagram.com/oauth/access_token", { client_id: id, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
  const short = reply.access_token ?? reply.data?.[0]?.access_token;
  if (!short) throw new Error("Instagram didn't return a sign-in token.");
  const long = await metaFetch<{ access_token: string; expires_in: number }>(`https://graph.instagram.com/access_token?${qs({ grant_type: "ig_exchange_token", client_secret: secret, access_token: short })}`);
  return { token: long.access_token, expiresIn: long.expires_in };
}
export async function refreshInstagramToken(token: string): Promise<InstagramToken> {
  const r = await metaFetch<{ access_token: string; expires_in: number }>(`https://graph.instagram.com/refresh_access_token?${qs({ grant_type: "ig_refresh_token", access_token: token })}`);
  return { token: r.access_token, expiresIn: r.expires_in };
}

export type InstagramProfile = { user_id: string; username: string; name?: string; account_type?: string; profile_picture_url?: string };
export const instagramProfile = (token: string) => metaFetch<InstagramProfile>(IG(`me?${qs({ fields: "user_id,username,name,account_type,profile_picture_url", access_token: token })}`));

/** A Reel container from our signed video link; Instagram then processes it before it can be published. */
export async function createInstagramReel(igId: string, token: string, videoUrl: string, caption: string): Promise<string> {
  return (await metaFetch<{ id: string }>(IG(`${igId}/media`), { media_type: "REELS", video_url: videoUrl, caption, access_token: token })).id;
}
export type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED";
export const instagramContainer = (id: string, token: string) => metaFetch<{ status_code?: ContainerStatus; status?: string }>(IG(`${id}?${qs({ fields: "status_code,status", access_token: token })}`));
export async function publishInstagram(igId: string, token: string, containerId: string): Promise<string> {
  return (await metaFetch<{ id: string }>(IG(`${igId}/media_publish`), { creation_id: containerId, access_token: token })).id;
}
export const instagramPermalink = async (mediaId: string, token: string) => (await metaFetch<{ permalink?: string }>(IG(`${mediaId}?${qs({ fields: "permalink", access_token: token })}`))).permalink ?? null;

/** A comment from the account on its own Reel (instagram_business_manage_comments). */
export async function commentOnInstagram(mediaId: string, token: string, message: string): Promise<string> {
  return (await metaFetch<{ id: string }>(IG(`${mediaId}/comments`), { message, access_token: token })).id;
}
