import { storage } from "../posting/media.ts";

/**
 * Rezekii's own copies of TikTok pictures (owner, 16 Oct 2026). TikTok's picture addresses are signed and stop working within a
 * day or two, so creator photos are saved once and refreshed every two weeks (creators rarely change them), and video covers
 * are saved the first time they're shown. Kept in Supabase storage (private bucket "img", pictures only) and served by /api/img.
 */
export const PHOTO_DAYS = 14;
const BUCKET = "img";
const CREATORS = "c";
const VIDEOS = "v";
const MAX_BYTES = 2_000_000;

/** The address while TikTok's signature still holds for `marginMs` more (x-expires), else null. Unsigned addresses always hold. */
export function freshUrl(url: string | null | undefined, now = Date.now(), marginMs = 0): string | null {
  if (!url) return null;
  const exp = url.match(/[?&]x-expires=(\d+)/);
  return exp && Number(exp[1]) * 1000 <= now + marginMs ? null : url;
}

/** Where the page loads a saved creator photo: the day in the address makes a refreshed photo replace the old one in caches. */
export const photoPath = (user: string, day: string) => `/api/img/c/${encodeURIComponent(user.toLowerCase())}?v=${day.replaceAll("-", "")}`;

/** A creator's photo: the saved copy, else TikTok's own address while it still works, else null (initials show). */
export function photoFor(user: string, url: string | null | undefined, saved: Map<string, string>, now = Date.now()): string | null {
  const day = user ? saved.get(user.toLowerCase()) : undefined;
  return day ? photoPath(user, day) : freshUrl(url, now);
}

/**
 * A signed-in user's own photo, without asking storage while the page renders (it's on every page): a TikTok creator's goes
 * through /api/img/c, which serves the saved copy or passes on to their TikTok photo; the address changes every two weeks, when
 * saved photos are refreshed. Anyone else (e.g. a Google sign-in) keeps their photo address.
 */
export function myPhoto(user: { tiktok_username?: string | null; avatar_url?: string | null }): string | null {
  if (!user.tiktok_username) return freshUrl(user.avatar_url);
  return `/api/img/c/${encodeURIComponent(user.tiktok_username.toLowerCase())}?p=${Math.floor(Date.now() / (PHOTO_DAYS * 86_400_000))}`;
}

/** The saved creator photos: lower-case username to the day it was saved. Re-read every 10 minutes (`force` reads now). */
let listing: { at: number; map: Map<string, string> } | null = null;
export async function savedPhotos(force = false): Promise<Map<string, string>> {
  if (!force && listing && Date.now() - listing.at < 10 * 60_000) return listing.map;
  const { base, headers } = storage();
  const map = new Map<string, string>();
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${base}/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ prefix: CREATORS, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`photo list failed: ${res.status}`);
    const page = (await res.json()) as { name: string; id: string | null; updated_at?: string | null; created_at?: string | null }[];
    for (const o of page) if (o.id && o.name.endsWith(".jpg")) map.set(o.name.slice(0, -4), (o.updated_at ?? o.created_at ?? "").slice(0, 10));
    if (page.length < 1000) break;
  }
  listing = { at: Date.now(), map };
  return map;
}

/** Downloads a picture from TikTok and saves it at `path` (replacing an older copy). Returns the picture, or null. */
async function saveImage(path: string, url: string): Promise<{ body: Uint8Array<ArrayBuffer>; type: string } | null> {
  const img = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  const type = img?.headers.get("content-type") ?? "";
  if (!img?.ok || !type.startsWith("image/")) return null;
  const body = new Uint8Array(await img.arrayBuffer());
  if (body.length < 100 || body.length > MAX_BYTES) return null;
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "content-type": type, "x-upsert": "true" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  return res.ok ? { body, type } : null;
}

/** Saves a creator's photo from a working TikTok address. */
export async function saveCreatorPhoto(user: string, url: string): Promise<boolean> {
  const ok = !!(await saveImage(`${CREATORS}/${encodeURIComponent(user.toLowerCase())}.jpg`, url));
  if (ok) listing?.map.set(user.toLowerCase(), new Date().toISOString().slice(0, 10));
  return ok;
}

export const saveVideoCover = (videoId: string, url: string) => saveImage(`${VIDEOS}/${videoId}.jpg`, url);

/** A saved picture as a response the browser and Vercel's CDN keep (the address changes when the picture does), or null. */
async function readImage(path: string): Promise<Response | null> {
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/${BUCKET}/${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  return res?.ok && res.body ? imageResponse(res.body, res.headers.get("content-type") ?? "image/jpeg") : null;
}

export const imageResponse = (body: BodyInit, type: string) =>
  new Response(body, { headers: { "content-type": type, "cache-control": "public, max-age=1209600, s-maxage=1209600, immutable" } });
export const noImage = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

export const readCreatorPhoto = (user: string) => readImage(`${CREATORS}/${encodeURIComponent(user.toLowerCase())}.jpg`);
export const readVideoCover = (videoId: string) => readImage(`${VIDEOS}/${videoId}.jpg`);
