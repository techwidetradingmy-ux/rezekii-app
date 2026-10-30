import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { queryCreatorInfo, type PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { nextRecommendedSlot, postProblems, type PostChoice } from "@/modules/posting/rules.ts";
import { freshTikTokToken, insertPost, listPosts, markTikTokReconnect, RECONNECT_TIKTOK, scheduledTimes, TIKTOK_LOST, userTikTokOpenId } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";

/** The signed-in creator's posts, newest scheduled first. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ posts: await listPosts(user.id) });
}

type Body = Partial<PostChoice> & { source?: "upload" | "link"; storagePath?: string; linkUrl?: string; when?: string; consent?: boolean; account?: string; staged?: boolean };
const bad = (error: string | string[]) => NextResponse.json({ error }, { status: 400 });

/**
 * Creates a post for the signed-in creator's own TikTok account.
 * `when`: "now", "recommended", "draft" (saved in Rezekii only) or an ISO time. `staged`: an edit being saved; it is held as
 * a draft with its time until /api/posts/swap puts it in place of the old post.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Body;
  const openId = await userTikTokOpenId(user.id, b.account);
  if (!openId) return NextResponse.json({ error: b.account ? "That TikTok account isn't connected to your Rezekii account." : "Continue with TikTok to post." }, { status: 409 });

  if (b.source === "upload" ? !b.storagePath?.startsWith(`${user.id}/`) : b.source === "link" ? !/^https:\/\/\S+$/.test(b.linkUrl ?? "") : true)
    return bad("Add a video: upload one or paste an https link.");
  const choice: PostChoice = {
    mode: b.mode === "inbox" ? "inbox" : "direct",
    caption: String(b.caption ?? ""),
    privacyLevel: (b.privacyLevel as PrivacyLevel) || null,
    allowComments: !!b.allowComments,
    allowDuet: !!b.allowDuet,
    allowStitch: !!b.allowStitch,
    promo: !!b.promo,
    brandOrganic: !!b.brandOrganic,
    brandedContent: !!b.brandedContent,
    isAigc: !!b.isAigc,
    durationSec: typeof b.durationSec === "number" ? b.durationSec : null,
  };
  const when = b.when ?? "draft";
  let scheduledAt: Date | null = null;
  if (when !== "draft") {
    const token = await freshTikTokToken(openId).catch((err: unknown) => {
      if (err instanceof Error && err.message === RECONNECT_TIKTOK) return null;
      throw err;
    });
    if (!token) return NextResponse.json({ error: RECONNECT_TIKTOK }, { status: 409 });
    const info = await queryCreatorInfo(token);
    if (info.error && TIKTOK_LOST.has(info.error.code)) {
      await markTikTokReconnect(openId);
      return NextResponse.json({ error: RECONNECT_TIKTOK }, { status: 409 });
    }
    if (info.error || !info.data) return NextResponse.json({ error: "TikTok says this account can't post right now. Try again later." }, { status: 503 });
    const problems = postProblems(choice, info.data);
    if (problems.length) return bad(problems);
    if (choice.mode === "direct" && !b.consent) return bad("Agree to TikTok's Music Usage Confirmation to post.");
    if (when === "now") scheduledAt = new Date();
    else if (when === "recommended") scheduledAt = nextRecommendedSlot(new Date(), await scheduledTimes(openId), await postingHours());
    else {
      scheduledAt = new Date(when);
      if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60e3) return bad("Pick a time at least a minute from now.");
      if (scheduledAt.getTime() > Date.now() + 60 * 86400e3) return bad("Pick a time within the next 60 days.");
    }
  }

  const post = await insertPost({
    user_id: user.id,
    tiktok_open_id: openId,
    mode: choice.mode,
    source: b.source as "upload" | "link",
    storage_path: b.source === "upload" ? b.storagePath : null,
    link_url: b.source === "link" ? b.linkUrl : null,
    duration_sec: choice.durationSec ?? null,
    caption: choice.caption,
    privacy_level: choice.privacyLevel ?? null,
    allow_comments: choice.allowComments,
    allow_duet: choice.allowDuet,
    allow_stitch: choice.allowStitch,
    brand_organic: choice.promo && choice.brandOrganic,
    branded_content: choice.promo && choice.brandedContent,
    is_aigc: choice.isAigc,
    status: scheduledAt && !b.staged ? "scheduled" : "draft",
    scheduled_at: scheduledAt?.toISOString() ?? null,
    next_attempt_at: scheduledAt?.toISOString() ?? null,
  });
  return NextResponse.json({ post }, { status: 201 });
}
