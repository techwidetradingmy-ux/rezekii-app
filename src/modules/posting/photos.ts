/**
 * Photo posts (owner, 21 Nov 2026): one or more photos instead of a video. New post turns every photo into a JPG of at most
 * 1080 × 1920 (TikTok takes up to 1080p, Instagram only JPG) and uploads it to `<user>/photos/<id>.jpg`; a channel's own
 * copy, or a copy kept by an edit, is `<user>/social/photos/<id>.jpg`. A post lists them in order in `photo_paths`, and its
 * `storage_path` is the first one.
 */
export const PHOTO_BYTES_MAX = 8 * 1024 * 1024;
/** The most photos any app takes in one post (TikTok); each app's own limit is PHOTO_MAX in social/rules.ts. */
export const PHOTOS_MAX = 35;

export const isPhotoPath = (userId: string, path: unknown): path is string =>
  typeof path === "string" && new RegExp(`^${userId}/(social/)?photos/[0-9a-f-]{36}\\.jpg$`).test(path);

/** The photos a post was sent with: a non-empty list of this user's photo uploads, or null when it isn't a photo post. */
export function cleanPhotoPaths(userId: string, value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  return value.length <= PHOTOS_MAX && value.every((p) => isPhotoPath(userId, p)) ? (value as string[]) : null;
}

/** Every stored file of a post: its video (or first photo) and the rest of its photos. */
export const filesOf = (row: { storage_path: string | null; photo_paths?: string[] | null }) => [...new Set([row.storage_path, ...(row.photo_paths ?? [])].filter((p): p is string => !!p))];
