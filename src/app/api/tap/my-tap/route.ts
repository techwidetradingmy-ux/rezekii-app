import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { myTapDetail } from "@/modules/tap/mytap.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Sample tracking and posts for one of the creator's TAP products: ?campaign=&product= (read live from TikTok). */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!user.tiktok_username) return NextResponse.json({ error: t("Sign in with TikTok to see your samples and posts.") }, { status: 400 });
  const p = req.nextUrl.searchParams;
  try {
    const detail = await myTapDetail(user.tiktok_username, p.get("campaign") ?? "", p.get("product") ?? "");
    return detail ? NextResponse.json(detail, { headers: { "cache-control": "private, max-age=300" } }) : NextResponse.json({ error: t("Not found.") }, { status: 404 });
  } catch (err) {
    console.error("[my-tap detail]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: t("TikTok could not load this right now. Please try again.") }, { status: 502 });
  }
}
