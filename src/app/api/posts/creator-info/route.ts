import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { queryCreatorInfo } from "@/integrations/tiktok/posting.ts";
import { nextRecommendedSlot } from "@/modules/posting/rules.ts";
import { freshTikTokToken, scheduledTimes, userTikTokOpenId } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";

/** Fresh TikTok account settings for the New post screen (TikTok requires reading them each time it opens). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const openId = await userTikTokOpenId(user.id);
  if (!openId) return NextResponse.json({ error: "Continue with TikTok to post." }, { status: 409 });
  const info = await queryCreatorInfo(await freshTikTokToken(openId));
  if (info.error || !info.data) return NextResponse.json({ error: `TikTok says this account can't post right now. Try again later. (${info.error?.message ?? "no reply"})` }, { status: 503 });
  return NextResponse.json({ ...info.data, nextRecommended: nextRecommendedSlot(new Date(), await scheduledTimes(openId)).toISOString() });
}
