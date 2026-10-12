import type { CreatorInfo, PostInfo, PrivacyLevel, PublishStatus } from "../../integrations/tiktok/posting.ts";

/** What a creator chose on the New post screen. */
export type PostChoice = {
  mode: "direct" | "inbox";
  caption: string;
  privacyLevel?: PrivacyLevel | null;
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  /** "Disclose promotional content" switch, then: Your brand / Branded content. */
  promo: boolean;
  brandOrganic: boolean;
  brandedContent: boolean;
  isAigc: boolean;
  durationSec?: number | null;
};

export const CAPTION_MAX = 2200;

/**
 * Checks a post against TikTok's Content Sharing Guidelines and the account's creator info.
 * Returns plain-language problems (empty = OK). Drafts sent to TikTok's inbox only need a video.
 */
export function postProblems(p: PostChoice, info: CreatorInfo): string[] {
  const out: string[] = [];
  if (p.caption.length > CAPTION_MAX) out.push(`The caption is longer than ${CAPTION_MAX} characters.`);
  if (p.durationSec && p.durationSec > info.max_video_post_duration_sec)
    out.push(`This video is longer than TikTok allows for this account (${Math.floor(info.max_video_post_duration_sec / 60)} min max).`);
  if (p.mode === "inbox") return out;
  if (!p.privacyLevel) out.push("Choose who can view this post.");
  else if (!info.privacy_level_options.includes(p.privacyLevel)) out.push("TikTok doesn't allow that privacy choice for this account right now. Choose again.");
  if (p.promo && !p.brandOrganic && !p.brandedContent) out.push("You need to indicate if your content promotes yourself, a third party, or both.");
  if (p.promo && p.brandedContent && p.privacyLevel === "SELF_ONLY") out.push("Branded content visibility cannot be set to private.");
  return out;
}

/** TikTok's post_info. Interactions the creator turned off in TikTok stay off, whatever was chosen. */
export function toPostInfo(p: PostChoice, info: CreatorInfo): PostInfo {
  if (!p.privacyLevel) throw new Error("privacy level missing");
  return {
    title: p.caption,
    privacy_level: p.privacyLevel,
    disable_comment: info.comment_disabled || !p.allowComments,
    disable_duet: info.duet_disabled || !p.allowDuet,
    disable_stitch: info.stitch_disabled || !p.allowStitch,
    brand_organic_toggle: p.promo && p.brandOrganic,
    brand_content_toggle: p.promo && p.brandedContent,
    is_aigc: p.isAigc,
  };
}

/** The consent line shown above the post button (TikTok requires it). */
export const consentLine = (p: Pick<PostChoice, "promo" | "brandedContent">) =>
  p.promo && p.brandedContent ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation." : "By posting, you agree to TikTok's Music Usage Confirmation.";

const MYT = 8 * 3600e3;
export const RECOMMENDED_HOURS = [6, 12, 20];
export const DAILY_CAP = 15;

/**
 * Next free recommended time (Malaysia time) at least `leadMin` minutes from now, skipping slots already taken
 * by this account and days that hit the daily cap.
 */
export function nextRecommendedSlot(now: Date, taken: Date[], hours = RECOMMENDED_HOURS, leadMin = 10): Date {
  const takenMs = new Set(taken.map((d) => d.getTime()));
  const perDay = new Map<string, number>();
  for (const d of taken) { const k = new Date(d.getTime() + MYT).toISOString().slice(0, 10); perDay.set(k, (perDay.get(k) ?? 0) + 1); }
  const startOfMytDay = Math.floor((now.getTime() + MYT) / 86400e3) * 86400e3 - MYT;
  for (let day = 0; day < 60; day++) {
    const dayStart = startOfMytDay + day * 86400e3;
    const key = new Date(dayStart + MYT).toISOString().slice(0, 10);
    if ((perDay.get(key) ?? 0) >= DAILY_CAP) continue;
    for (const h of hours) {
      const t = dayStart + h * 3600e3;
      if (t >= now.getTime() + leadMin * 60e3 && !takenMs.has(t)) return new Date(t);
    }
  }
  throw new Error("no free recommended time in the next 60 days");
}

/** Minutes to wait before try 2 and try 3 (about 30 minutes in all); after the 3rd failed try the post is Failed. */
export const RETRY_DELAYS_MIN = [5, 25];
export const MAX_ATTEMPTS = 3;

/** After a failed try: when to try again, or null when it's out of tries. */
export function nextRetry(attemptsSoFar: number, now: Date): Date | null {
  if (attemptsSoFar >= MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + RETRY_DELAYS_MIN[Math.min(attemptsSoFar, RETRY_DELAYS_MIN.length) - 1] * 60e3);
}

/** TikTok's processing status → Rezekii's post status (null = still processing). */
export function statusFromTikTok(s: PublishStatus["status"]): "posted" | "sent_to_inbox" | "failed" | null {
  if (s === "PUBLISH_COMPLETE") return "posted";
  if (s === "SEND_TO_USER_INBOX") return "sent_to_inbox";
  if (s === "FAILED") return "failed";
  return null;
}
