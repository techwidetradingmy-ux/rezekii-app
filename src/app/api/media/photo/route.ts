import { type NextRequest } from "next/server";
import { BUCKET, storage } from "@/modules/posting/media.ts";
import { checkPhotoLink } from "@/modules/posting/photo-links.ts";

export const dynamic = "force-dynamic";

/** One photo of a post, for TikTok to fetch from rezekii.com (photoLink). Only signed links that haven't run out work. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const path = checkPhotoLink(q.get("p"), q.get("e"), q.get("s"));
  if (!path) return new Response("Not found", { status: 404 });
  const { base, headers } = storage();
  const res = await fetch(`${base}/object/${BUCKET}/${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok || !res.body) return new Response("Not found", { status: 404 });
  return new Response(res.body, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600", ...(res.headers.get("content-length") ? { "content-length": res.headers.get("content-length") as string } : {}) } });
}
