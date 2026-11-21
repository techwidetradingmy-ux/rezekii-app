import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed rezekii.com links to a post's photos, for TikTok (server only). */
const linkKey = () => {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) throw new Error("TOKEN_ENCRYPTION_KEY must be set");
  return createHmac("sha256", k).update("rezekii photo links").digest();
};
const sign = (path: string, exp: number) => createHmac("sha256", linkKey()).update(`${path}\n${exp}`).digest("base64url");

/**
 * A rezekii.com address TikTok fetches a photo from: TikTok only pulls photos from a domain verified in its developer
 * portal (rezekii.com is), over https without redirects, for up to an hour. Signed, and it stops working after `hours`.
 */
export function photoLink(path: string, hours = 3, base = process.env.APP_URL ?? "https://rezekii.com"): string {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  return `${base.replace(/\/$/, "")}/api/media/photo?${new URLSearchParams({ p: path, e: String(exp), s: sign(path, exp) })}`;
}

/** The stored path a photo link points to, or null when the link was changed or has run out. */
export function checkPhotoLink(p: string | null, e: string | null, s: string | null, now = Date.now()): string | null {
  const exp = Number(e);
  if (!p || !s || !Number.isFinite(exp) || exp * 1000 < now || !/^[0-9a-f-]{36}\/(social\/)?photos\/[0-9a-f-]{36}\.jpg$/.test(p)) return null;
  const want = Buffer.from(sign(p, exp)), got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? p : null;
}
