import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { signedMediaUrl } from "@/modules/social/store.ts";

export const dynamic = "force-dynamic";

/**
 * A calendar post's video or first photo (owner, 23 Nov 2026: "we need a preview of the video"): her own post only, sent on to a
 * short-lived storage link. The calendar asks for it only when the post scrolls into view, so opening the calendar stays quick.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const q = req.nextUrl.searchParams;
  const id = q.get("id") ?? "";
  const table = q.get("kind") === "tiktok" ? "posts" : "social_posts";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const [row] = (await (await supabaseRest(`${table}?id=eq.${id}&user_id=eq.${user.id}&select=storage_path,photo_paths&limit=1`)).json().catch(() => [])) as { storage_path: string | null; photo_paths: string[] | null }[];
  const path = row?.photo_paths?.[0] ?? row?.storage_path;
  if (!path) return new NextResponse(null, { status: 404 });
  const url = await signedMediaUrl(path, 3600).catch(() => null);
  if (!url) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "private, max-age=3000" } });
}
