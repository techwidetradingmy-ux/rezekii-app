import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cleanPhotoPaths } from "@/modules/posting/photos.ts";
import { canPost } from "@/lib/platforms";
import { queryCreatorInfo, type PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { nextRecommendedSlot, postProblems, type PostChoice } from "@/modules/posting/rules.ts";
import { freshTikTokToken, insertPost, listPosts, markTikTokReconnect, RECONNECT_TIKTOK, scheduledTimes, TIKTOK_LOST, updatePost, userTikTokOpenId } from "@/modules/posting/store.ts";
import { canPay, chargePosts, postSide } from "@/modules/rewards/post-credits.ts";
import { errorLine } from "@/modules/posting/errors.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** The signed-in creator's posts, newest scheduled first. */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  // Rezekii's own reasons a post failed are saved in English: shown in her language (TikTok's own words stay as they are).
  return NextResponse.json({ posts: (await listPosts(user.id)).map((p) => (p.last_error ? { ...p, last_error: errorLine(t, p.last_error) } : p)) });
}

type Body = Partial<PostChoice> & { source?: "upload" | "link"; storagePath?: string; photoPaths?: unknown; linkUrl?: string; when?: string; consent?: boolean; account?: string; staged?: boolean; side?: string };
const bad = (error: string | string[]) => NextResponse.json({ error }, { status: 400 });

/**
 * Creates a post for the signed-in creator's own TikTok account.
 * `when`: "now", "recommended", "draft" (saved in Rezekii only) or an ISO time. `staged`: an edit being saved; it is held as
 * a draft with its time until /api/posts/swap puts it in place of the old post.
 */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  // Posting to TikTok waits for TikTok's approval (owner, 3 Nov 2026); admins can still post.
  if (!canPost("tiktok", user.role === "admin")) return NextResponse.json({ error: t("Posting to TikTok is waiting for TikTok's approval. Coming soon.") }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Body;
  const openId = await userTikTokOpenId(user.id, b.account);
  if (!openId) return NextResponse.json({ error: b.account ? t("That TikTok account isn't connected to your Rezekii account.") : t("Continue with TikTok to post.") }, { status: 409 });

  // A photo post sends its photos in order (1 to 35); a video post one upload or a link.
  const photos = b.photoPaths === undefined ? null : cleanPhotoPaths(user.id, b.photoPaths);
  if (b.photoPaths !== undefined && !photos) return bad(t("The photos weren't uploaded. Add them again."));
  if (!photos && (b.source === "upload" ? !b.storagePath?.startsWith(`${user.id}/`) : b.source === "link" ? !/^https:\/\/\S+$/.test(b.linkUrl ?? "") : true))
    return bad(t("Add a video or photos: upload them or paste a video link."));
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
    durationSec: photos || typeof b.durationSec !== "number" ? null : b.durationSec,
  };
  const when = b.when ?? "draft";
  let scheduledAt: Date | null = null;
  if (when !== "draft") {
    const token = await freshTikTokToken(openId).catch((err: unknown) => {
      if (err instanceof Error && err.message === RECONNECT_TIKTOK) return null;
      throw err;
    });
    if (!token) return NextResponse.json({ error: t(RECONNECT_TIKTOK) }, { status: 409 });
    const info = await queryCreatorInfo(token);
    if (info.error && TIKTOK_LOST.has(info.error.code)) {
      await markTikTokReconnect(openId);
      return NextResponse.json({ error: t(RECONNECT_TIKTOK) }, { status: 409 });
    }
    if (info.error || !info.data) return NextResponse.json({ error: t("TikTok says this account can't post right now. Try again later.") }, { status: 503 });
    const problems = postProblems(choice, info.data, t);
    if (problems.length) return bad(problems);
    if (choice.mode === "direct" && !b.consent) return bad(t("Agree to TikTok's Music Usage Confirmation to post."));
    if (when === "now") scheduledAt = new Date();
    else if (when === "recommended") scheduledAt = nextRecommendedSlot(new Date(), await scheduledTimes(openId), await postingHours());
    else {
      scheduledAt = new Date(when);
      if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60e3) return bad(t("Pick a time at least a minute from now."));
      if (scheduledAt.getTime() > Date.now() + 60 * 86400e3) return bad(t("Pick a time within the next 60 days."));
    }
  }

  // Post Everywhere costs credits per channel from the creator or seller wallet; drafts are free.
  const side = postSide(b.side);
  if (scheduledAt && !b.staged && !(await canPay(user.id, side, 1))) return NextResponse.json({ error: t("Not enough credits for TikTok. Earn more or save as a draft.") }, { status: 402 });

  const post = await insertPost({
    user_id: user.id,
    tiktok_open_id: openId,
    mode: choice.mode,
    source: photos ? "upload" : (b.source as "upload" | "link"),
    storage_path: photos ? photos[0] : b.source === "upload" ? b.storagePath : null,
    photo_paths: photos,
    link_url: !photos && b.source === "link" ? b.linkUrl : null,
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
  if (post.status === "scheduled") {
    const paid = await chargePosts(user.id, side, [{ id: post.id, app: "tiktok" }], t);
    if (!paid.ok) {
      await updatePost(post.id, { status: "cancelled", next_attempt_at: null });
      return NextResponse.json({ error: paid.error }, { status: 402 });
    }
  }
  return NextResponse.json({ post }, { status: 201 });
}
