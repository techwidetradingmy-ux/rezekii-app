import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { queryCreatorInfo } from "@/integrations/tiktok/posting.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { nextRecommendedSlot } from "@/modules/posting/rules.ts";
import { freshTikTokToken, scheduledTimes, userTikTokOpenId } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";

/** Fresh TikTok account settings for the New post screen (TikTok requires reading them each time it opens). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const account = req.nextUrl.searchParams.get("account");
  const openId = await userTikTokOpenId(user.id, account);
  if (!openId) return NextResponse.json({ error: account ? "That TikTok account isn't connected to your Rezekii account." : "Continue with TikTok to post." }, { status: 409 });
  const info = await queryCreatorInfo(await freshTikTokToken(openId));
  if (info.error || !info.data) return NextResponse.json({ error: `TikTok says this account can't post right now. Try again later. (${info.error?.message ?? "no reply"})` }, { status: 503 });
  return NextResponse.json({ ...info.data, nextRecommended: nextRecommendedSlot(new Date(), await scheduledTimes(openId), await postingHours()).toISOString() });
}
