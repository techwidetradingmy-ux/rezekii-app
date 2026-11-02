import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { queryCreatorInfo } from "@/integrations/tiktok/posting.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { nextRecommendedSlot } from "@/modules/posting/rules.ts";
import { freshTikTokToken, markTikTokReconnect, RECONNECT_TIKTOK, scheduledTimes, TIKTOK_LOST, userTikTokOpenId } from "@/modules/posting/store.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Fresh TikTok account settings for the New post screen (TikTok requires reading them each time it opens). */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const account = req.nextUrl.searchParams.get("account");
  const openId = await userTikTokOpenId(user.id, account);
  if (!openId) return NextResponse.json({ error: account ? t("That TikTok account isn't connected to your Rezekii account.") : t("Continue with TikTok to post.") }, { status: 409 });
  let token: string;
  try {
    token = await freshTikTokToken(openId);
  } catch (err) {
    console.error("[creator-info] token", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: t(RECONNECT_TIKTOK) }, { status: 409 });
  }
  const info = await queryCreatorInfo(token);
  if (info.error && TIKTOK_LOST.has(info.error.code)) {
    await markTikTokReconnect(openId);
    return NextResponse.json({ error: t(RECONNECT_TIKTOK) }, { status: 409 });
  }
  if (info.error || !info.data) return NextResponse.json({ error: t("TikTok says this account can't post right now. Try again later. ({error})", { error: info.error?.message ?? t("no reply") }) }, { status: 503 });
  return NextResponse.json({ ...info.data, nextRecommended: nextRecommendedSlot(new Date(), await scheduledTimes(openId), await postingHours()).toISOString() });
}
