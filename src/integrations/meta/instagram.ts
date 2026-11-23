import { MetaError, GRAPH_VERSION, metaApp, metaFetch, qs } from "./graph.ts";

/**
 * Instagram Business and Creator accounts, connected one of two ways (owner, 23 Nov 2026):
 * - Instagram Login (no Facebook Page needed): a 60-day token, on graph.instagram.com. Passed around as the bare token.
 * - Through Facebook (Facebook Login, via the Page the account is linked to): the Page's token, which doesn't expire, on
 *   graph.facebook.com. Only this way can a Reel get a licensed song (Meta: the Audio API "is not supported on the Instagram
 *   API with Instagram Login").
 */
export type IgAuth = string | { token: string; viaFacebook: true };
export const igToken = (a: IgAuth) => (typeof a === "string" ? a : a.token);
export const igUrl = (a: IgAuth, path: string) => `https://graph.${typeof a === "string" ? "instagram" : "facebook"}.com/${GRAPH_VERSION}/${path}`;
const tokenOf = igToken;
const IG = igUrl;
export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_comments"];
/** Community (Admins, owner 23 Oct 2026): account and post numbers and the DM inbox, on top of posting. */
export const INSTAGRAM_COMMUNITY_SCOPES = [...INSTAGRAM_SCOPES, "instagram_business_manage_insights", "instagram_business_manage_messages"];
/** Meta's second review (owner, 12 Nov 2026): account and post views and reach on top of what everyone has. */
export const INSTAGRAM_INSIGHTS_SCOPES = [...INSTAGRAM_SCOPES, "instagram_business_manage_insights"];

export function instagramAuthUrl(state: string, redirectUri: string, level: "basic" | "insights" | "community" = "basic"): string {
  const scope = { basic: INSTAGRAM_SCOPES, insights: INSTAGRAM_INSIGHTS_SCOPES, community: INSTAGRAM_COMMUNITY_SCOPES }[level].join(",");
  const q = new URLSearchParams({ client_id: metaApp("instagram").id, redirect_uri: redirectUri, response_type: "code", scope, state, force_reauth: "true" });
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

/** Asked of an Instagram account connected through Facebook: the Page's permissions plus Instagram's own (Facebook Login names). */
export const INSTAGRAM_FB_SCOPES = ["instagram_basic", "instagram_content_publish", "instagram_manage_comments", "pages_show_list", "pages_read_engagement", "business_management"];
/** The accounts Meta reviews with and Admins: views and reach too. */
export const INSTAGRAM_FB_INSIGHTS_SCOPES = [...INSTAGRAM_FB_SCOPES, "instagram_manage_insights"];

/**
 * Facebook's own sign-in for an Instagram account through its Page, with a saved Facebook Login for Business configuration
 * when there is one (META_IG_FB_CONFIG_ID; views and reach META_IG_FB_INSIGHTS_CONFIG_ID), plain scopes otherwise.
 */
export function instagramFacebookAuthUrl(state: string, redirectUri: string, level: "basic" | "insights" | "community" = "basic"): string {
  const q = new URLSearchParams({ client_id: metaApp("facebook").id, redirect_uri: redirectUri, state, response_type: "code" });
  const config = level === "basic" ? process.env.META_IG_FB_CONFIG_ID : process.env.META_IG_FB_INSIGHTS_CONFIG_ID;
  if (config) q.set("config_id", config);
  else q.set("scope", (level === "basic" ? INSTAGRAM_FB_SCOPES : INSTAGRAM_FB_INSIGHTS_SCOPES).join(","));
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${q}`;
}

export type PageInstagram = { pageToken: string; id: string; username?: string; name?: string; profile_picture_url?: string };
/** The Instagram accounts linked to the Pages ticked on Facebook's screen, each with its Page's token (one per account). */
export async function pagesInstagram(userToken: string): Promise<PageInstagram[]> {
  type Page = { access_token: string; instagram_business_account?: { id: string; username?: string; name?: string; profile_picture_url?: string } };
  const fields = "access_token,instagram_business_account{id,username,name,profile_picture_url}";
  const r = await metaFetch<{ data?: Page[] }>(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?${qs({ fields, limit: "100", access_token: userToken })}`);
  const out = new Map<string, PageInstagram>();
  for (const p of r.data ?? []) if (p.instagram_business_account && !out.has(p.instagram_business_account.id)) out.set(p.instagram_business_account.id, { pageToken: p.access_token, ...p.instagram_business_account });
  return [...out.values()];
}
/** An account's name and current picture link (through Facebook there's no "me": it would be the Page). */
export const instagramAccount = (igId: string, auth: IgAuth) => metaFetch<{ username?: string; name?: string; profile_picture_url?: string }>(IG(auth, `${igId}?${qs({ fields: "username,name,profile_picture_url", access_token: tokenOf(auth) })}`));

/** A song from Instagram's licensed catalogue (Meta's Audio API, through Facebook only). */
export type Song = { id: string; title: string; artist: string; seconds: number | null; cover: string | null; preview: string | null };
type RawSong = { audio_id?: string | number; title?: string; display_artist?: string; duration_in_ms?: number; cover_artwork_thumbnail_uri?: string; download_url?: string };
/** Songs matching the search, or Instagram's trending songs when it's empty. `preview` is a short clip (its link expires). */
export async function instagramSongs(igId: string, auth: IgAuth, search = ""): Promise<Song[]> {
  const q: Record<string, string> = { audio_type: "music", user_id: igId, access_token: tokenOf(auth) };
  if (search.trim()) q.search_query = search.trim();
  const r = await metaFetch<{ audio?: RawSong[]; data?: RawSong[] }>(IG(auth, `ig_audio?${qs(q)}`));
  return (r.audio ?? r.data ?? []).filter((x) => x.audio_id != null).map((x) => ({
    id: String(x.audio_id),
    title: x.title ?? "",
    artist: x.display_artist ?? "",
    seconds: x.duration_in_ms ? Math.round(x.duration_in_ms / 1000) : null,
    cover: x.cover_artwork_thumbnail_uri ?? null,
    preview: x.download_url ?? null,
  }));
}

export type InstagramProfile = { user_id: string; username: string; name?: string; account_type?: string; profile_picture_url?: string };
export const instagramProfile = (token: string) => metaFetch<InstagramProfile>(IG(token, `me?${qs({ fields: "user_id,username,name,account_type,profile_picture_url", access_token: token })}`));

/** A Reel container from our signed video link; Instagram then processes it before it can be published. */
export async function createInstagramReel(igId: string, auth: IgAuth, videoUrl: string, caption: string, o: { feed?: boolean; collaborators?: string[]; tags?: string[]; trial?: "off" | "manual" | "auto"; audio?: { id: string; volume: number } | null } = {}): Promise<string> {
  const form: Record<string, string> = { media_type: "REELS", video_url: videoUrl, caption, share_to_feed: String(o.feed !== false), access_token: tokenOf(auth) };
  // A licensed song (through Facebook only): Instagram mixes it under the video's own sound, which stays at full volume.
  if (o.audio && typeof auth !== "string") form.audio_configuration = JSON.stringify({ audio_id: o.audio.id, audio_volume: o.audio.volume, video_volume: 100 });
  if (o.collaborators?.length) form.collaborators = JSON.stringify(o.collaborators);
  // Tagged people (Reels take usernames only, no position); they get a notification and see it in their Tagged tab.
  if (o.tags?.length) form.user_tags = JSON.stringify(o.tags.map((username) => ({ username })));
  // Trial reels go to non-followers first; MANUAL waits for the owner to share it with followers in the app.
  if (o.trial && o.trial !== "off") form.trial_params = JSON.stringify({ graduation_strategy: o.trial === "manual" ? "MANUAL" : "SS_PERFORMANCE" });
  return (await metaFetch<{ id: string }>(IG(auth, `${igId}/media`), form)).id;
}
/**
 * A photo post container: one photo, or a carousel of up to 20 (each photo its own item container first). Instagram takes
 * JPG photos from 4:5 to 1.91:1. Tagged people are placed in the middle of the first photo (photos need a position).
 */
export async function createInstagramPhotos(igId: string, auth: IgAuth, photoUrls: string[], caption: string, o: { collaborators?: string[]; tags?: string[] } = {}): Promise<string> {
  const tags = o.tags?.length ? JSON.stringify(o.tags.map((username) => ({ username, x: 0.5, y: 0.5 }))) : null;
  const collab: Record<string, string> = o.collaborators?.length ? { collaborators: JSON.stringify(o.collaborators) } : {};
  if (photoUrls.length === 1) return (await metaFetch<{ id: string }>(IG(auth, `${igId}/media`), { image_url: photoUrls[0], caption, ...collab, ...(tags ? { user_tags: tags } : {}), access_token: tokenOf(auth) })).id;
  const children: string[] = [];
  for (const [i, url] of photoUrls.entries()) children.push((await metaFetch<{ id: string }>(IG(auth, `${igId}/media`), { image_url: url, is_carousel_item: "true", ...(i === 0 && tags ? { user_tags: tags } : {}), access_token: tokenOf(auth) })).id);
  return (await metaFetch<{ id: string }>(IG(auth, `${igId}/media`), { media_type: "CAROUSEL", children: children.join(","), caption, ...collab, access_token: tokenOf(auth) })).id;
}
export type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED";
export const instagramContainer = (id: string, auth: IgAuth) => metaFetch<{ status_code?: ContainerStatus; status?: string }>(IG(auth, `${id}?${qs({ fields: "status_code,status", access_token: tokenOf(auth) })}`));
export async function publishInstagram(igId: string, auth: IgAuth, containerId: string): Promise<string> {
  return (await metaFetch<{ id: string }>(IG(auth, `${igId}/media_publish`), { creation_id: containerId, access_token: tokenOf(auth) })).id;
}
export const instagramPermalink = async (mediaId: string, auth: IgAuth) => (await metaFetch<{ permalink?: string }>(IG(auth, `${mediaId}?${qs({ fields: "permalink", access_token: tokenOf(auth) })}`))).permalink ?? null;

/** A comment from the account on its own Reel (instagram_business_manage_comments). */
export async function commentOnInstagram(mediaId: string, auth: IgAuth, message: string): Promise<string> {
  return (await metaFetch<{ id: string }>(IG(auth, `${mediaId}/comments`), { message, access_token: tokenOf(auth) })).id;
}

/** Whether a post still exists (false once it was deleted in the app); other errors are thrown. */
export async function instagramPostExists(id: string, auth: IgAuth): Promise<boolean> {
  try {
    await metaFetch(IG(auth, `${id}?${qs({ fields: "id", access_token: tokenOf(auth) })}`));
    return true;
  } catch (err) {
    if (err instanceof MetaError && err.gone) return false;
    throw err;
  }
}
