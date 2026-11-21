import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { loadEdit } from "@/modules/posting/edit.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Edit for a scheduled post (as on rezekii.com since 23 Oct 2026): ?key= the TikTok post or the group. New Post fills itself in
 * from this, keeping the video or photos. 409 once any part has started sending or gone out.
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const edit = await loadEdit(user.id, req.nextUrl.searchParams.get("key") ?? "").catch(() => null);
  return edit
    ? NextResponse.json(edit, { headers: { "cache-control": "private, no-store" } })
    : NextResponse.json({ error: t("It has started sending or has gone out, so it can't be edited any more.") }, { status: 409 });
}
