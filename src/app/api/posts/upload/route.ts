import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { signedUploadUrl } from "@/modules/posting/media.ts";
import { PHOTO_BYTES_MAX } from "@/modules/posting/photos.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const MAX_BYTES = 50 * 1024 * 1024;
/** The first comment's image (C4d): Threads takes JPG or PNG up to 8 MB, the stricter of Facebook and Threads. */
const IMAGES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
const IMAGE_MAX = 8 * 1024 * 1024;

/**
 * A one-time upload address for one video, one photo of a photo post (New post has already made it a JPG, photos.ts), or the
 * first comment's image. The browser sends the file straight to storage.
 */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const { type, size, kind } = (await req.json().catch(() => ({}))) as { type?: string; size?: number; kind?: string };
  if (kind === "photo") {
    if (type !== "image/jpeg") return NextResponse.json({ error: t("Photos are sent as JPG. Add the photo again.") }, { status: 400 });
    if (!size || size > PHOTO_BYTES_MAX) return NextResponse.json({ error: t("Each photo can be up to 8 MB.") }, { status: 400 });
    const path = `${user.id}/photos/${randomUUID()}.jpg`;
    return NextResponse.json({ path, uploadUrl: await signedUploadUrl(path) });
  }
  if (kind === "comment-image") {
    const ext = type ? IMAGES[type] : undefined;
    if (!ext) return NextResponse.json({ error: t("Choose a JPG or PNG image for the comment.") }, { status: 400 });
    if (!size || size > IMAGE_MAX) return NextResponse.json({ error: t("Comment images can be up to 8 MB.") }, { status: 400 });
    const path = `${user.id}/comment/${randomUUID()}.${ext}`;
    return NextResponse.json({ path, uploadUrl: await signedUploadUrl(path) });
  }
  const ext = type ? TYPES[type] : undefined;
  if (!ext) return NextResponse.json({ error: t("Choose an MP4, MOV or WebM video.") }, { status: 400 });
  if (!size || size > MAX_BYTES) return NextResponse.json({ error: t("Videos up to 50 MB can be uploaded. For bigger files, paste a link instead.") }, { status: 400 });
  const path = `${user.id}/${randomUUID()}.${ext}`;
  return NextResponse.json({ path, uploadUrl: await signedUploadUrl(path) });
}
