/**
 * Where a post's video comes from: an upload in Supabase storage (bucket post-media) or a pasted link.
 * Videos are read in byte ranges, so a big file never has to sit in memory at once.
 */
export const BUCKET = "post-media";

function storage(): { base: string; headers: Record<string, string> } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return { base: `${url}/storage/v1`, headers: { apikey: key, authorization: `Bearer ${key}` } };
}

/** A one-time address the creator's browser uploads the file to (straight to storage, not through our server). */
export async function signedUploadUrl(path: string): Promise<string> {
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`storage sign failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const { url } = (await res.json()) as { url: string };
  return `${base}${url}`;
}

export async function deleteUpload(path: string): Promise<void> {
  const { base, headers } = storage();
  await fetch(`${base}/object/${BUCKET}/${path}`, { method: "DELETE", headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
}

/** Turns share links into direct file links: Google Drive ("Anyone with the link") and Dropbox; others pass through. */
export function directLink(link: string): string {
  const u = new URL(link.trim());
  const drive = u.hostname.endsWith("drive.google.com") && (u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get("id"));
  if (drive) return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(drive)}&export=download&confirm=t`;
  if (u.hostname.endsWith("dropbox.com")) { u.searchParams.set("dl", "1"); return u.toString(); }
  return u.toString();
}

export type Media = { size: number; mime: string; read: (start: number, end: number) => Promise<Uint8Array<ArrayBuffer>> };

/** Opens a video for reading. Throws a plain-language error when the link can't be read. */
export async function openMedia(src: { storagePath?: string | null; linkUrl?: string | null }): Promise<Media> {
  const target = src.storagePath ? { url: `${storage().base}/object/${BUCKET}/${src.storagePath}`, headers: storage().headers } : { url: directLink(src.linkUrl ?? ""), headers: {} as Record<string, string> };
  const probe = await fetch(target.url, { headers: { ...target.headers, range: "bytes=0-0" }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!probe.ok) throw new Error(src.storagePath ? "The uploaded video is missing from storage." : `Can't open the video link (HTTP ${probe.status}). Set sharing to "Anyone with the link".`);
  const mime = (probe.headers.get("content-type") ?? "").split(";")[0];
  if (mime.startsWith("text/html")) throw new Error('The link opens a web page, not a video file. Set sharing to "Anyone with the link" or use a direct file link.');
  const total = Number(probe.headers.get("content-range")?.split("/")[1] ?? probe.headers.get("content-length"));
  await probe.body?.cancel();
  if (!total || probe.status !== 206) throw new Error("The video host doesn't allow reading the file in parts. Upload the video instead.");
  return {
    size: total,
    mime: mime.startsWith("video/") ? mime : "video/mp4",
    read: async (start, end) => {
      const r = await fetch(target.url, { headers: { ...target.headers, range: `bytes=${start}-${end}` }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(90_000) });
      if (r.status !== 206) throw new Error(`reading bytes ${start}-${end} failed: HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
