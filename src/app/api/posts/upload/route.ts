import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { signedUploadUrl } from "@/modules/posting/media.ts";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const MAX_BYTES = 50 * 1024 * 1024;
/** The first comment's image (C4d): Threads takes JPG or PNG up to 8 MB, the stricter of Facebook and Threads. */
const IMAGES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
const IMAGE_MAX = 8 * 1024 * 1024;

/** A one-time upload address for one video, or for the first comment's image (the browser sends the file straight to storage). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { type, size, kind } = (await req.json().catch(() => ({}))) as { type?: string; size?: number; kind?: string };
  if (kind === "comment-image") {
    const ext = type ? IMAGES[type] : undefined;
    if (!ext) return NextResponse.json({ error: "Choose a JPG or PNG image for the comment." }, { status: 400 });
    if (!size || size > IMAGE_MAX) return NextResponse.json({ error: "Comment images can be up to 8 MB." }, { status: 400 });
    const path = `${user.id}/comment/${randomUUID()}.${ext}`;
    return NextResponse.json({ path, uploadUrl: await signedUploadUrl(path) });
  }
  const ext = type ? TYPES[type] : undefined;
  if (!ext) return NextResponse.json({ error: "Choose an MP4, MOV or WebM video." }, { status: 400 });
  if (!size || size > MAX_BYTES) return NextResponse.json({ error: "Videos up to 50 MB can be uploaded. For bigger files, paste a link instead." }, { status: 400 });
  const path = `${user.id}/${randomUUID()}.${ext}`;
  return NextResponse.json({ path, uploadUrl: await signedUploadUrl(path) });
}
