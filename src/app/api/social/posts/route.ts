import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getUserPost } from "@/modules/posting/store.ts";
import { nextRecommendedSlot } from "@/modules/posting/rules.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { getAccount } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { NAMES, channelProblems, facebookAsReel, photoProblems, shopeeProblems } from "@/modules/social/rules.ts";
import { getShopee, shopeeLabel } from "@/modules/shopee/connections.ts";
import type { ShopeeSettings } from "@/modules/shopee/posting.ts";
import { cleanPhotoPaths } from "@/modules/posting/photos.ts";
import { cleanSettings, settingsProblems } from "@/modules/social/settings.ts";
import { fileInUse } from "@/modules/posting/edit.ts";
import { copyUpload, insertSocialPosts, listSocialPosts, postsInDay, updateSocialPost, type NewSocialPost } from "@/modules/social/store.ts";
import { canPay, chargePosts, postSide } from "@/modules/rewards/post-credits.ts";
import { errorLine } from "@/modules/posting/errors.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Daily caps per account (rolling 24 h): Instagram 100, Threads 250, Facebook Reels 30. */
const DAILY_CAP = { instagram: 100, threads: 250, facebook: 30 };
/** A Shopee account picked in New Post comes as "shopee:<connection id>" (Shopee Video, owner 21 Nov 2026: from rezekii.com's Shopee build). */
const SHOPEE_KEY = /^shopee:([0-9a-f-]{36})$/;

export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ posts: [] });
  // Rezekii's own reasons a post failed are saved in English: shown in her language (the app's own words stay as they are).
  return NextResponse.json({ posts: (await listSocialPosts(user.id)).map((p) => ({ ...p, ...(p.last_error ? { last_error: errorLine(t, p.last_error) } : {}), ...(p.comment_error ? { comment_error: errorLine(t, p.comment_error) } : {}) })) });
}

type ChannelIn = { accountId?: string; caption?: string; firstComment?: string; settings?: unknown };
type Body = { source?: "upload" | "link"; storagePath?: string; photoPaths?: unknown; instagramPhotoPaths?: unknown; linkUrl?: string; durationSec?: number; when?: string; tiktokPostId?: string; commentImagePath?: string; channels?: ChannelIn[]; staged?: boolean; side?: string };
const bad = (error: string | string[], status = 400) => NextResponse.json({ error }, { status });

/**
 * Schedules the Meta and Shopee channels of one New post. Each channel gets its own post (its own caption and first comment), all in
 * one group with the TikTok post when there is one. With a TikTok post, the channels go out at the TikTok post's time.
 * `staged`: an edit being saved, held as drafts with their time until /api/posts/swap puts them in place of the old post.
 */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return bad(t("Sign in first."), 401);
  if (!canUseSocial(user)) return bad(t("Not available yet."), 403);
  const b = (await req.json().catch(() => ({}))) as Body;
  // A photo post sends its photos in order; a video post one upload or a link.
  const photos = b.photoPaths === undefined ? null : cleanPhotoPaths(user.id, b.photoPaths);
  if (b.photoPaths !== undefined && !photos) return bad(t("The photos weren't uploaded. Add them again."));
  // Instagram's own copies, cut to fit, in the same order (New post sends them when a photo is too tall or wide for Instagram).
  const igPhotos = b.instagramPhotoPaths === undefined || !photos ? null : cleanPhotoPaths(user.id, b.instagramPhotoPaths);
  if (b.instagramPhotoPaths !== undefined && photos && igPhotos?.length !== photos.length) return bad(t("The photos weren't uploaded. Add them again."));
  if (!photos && (b.source === "upload" ? !b.storagePath?.startsWith(`${user.id}/`) : b.source === "link" ? !/^https:\/\/\S+$/.test(b.linkUrl ?? "") : true))
    return bad(t("Add a video or photos: upload them or paste a video link."));
  let commentImage = b.commentImagePath ?? null;
  if (commentImage && !new RegExp(`^${user.id}/comment/[0-9a-f-]{36}\\.(jpg|png)$`).test(commentImage)) return bad(t("The comment image upload wasn't found. Add it again."));
  const picked = (b.channels ?? []).filter((c) => c.accountId);
  if (!picked.length) return bad(t("Pick at least one Facebook, Instagram, Threads or Shopee channel."));
  const channels = picked.filter((c) => !SHOPEE_KEY.test(String(c.accountId)));
  const shopeeChannels = picked.filter((c) => SHOPEE_KEY.test(String(c.accountId)));
  const durationSec = !photos && typeof b.durationSec === "number" ? b.durationSec : null;

  const accounts = await Promise.all(channels.map((c) => getAccount(String(c.accountId), user.id)));
  const shops = await Promise.all(shopeeChannels.map((c) => getShopee(String(c.accountId).replace("shopee:", ""), user.id)));
  const problems: string[] = [];
  if (photos && shopeeChannels.length) problems.push(t("Shopee Video takes videos only. Untick Shopee for a photo post."));
  else shops.forEach((c, i) => {
    if (!c) problems.push(t("One of the channels isn't connected any more. Reload and pick again."));
    else if (c.status === "reconnect") problems.push(t("{channel} needs reconnecting first (Posts → Channels).", { channel: shopeeLabel(c) }));
    else if (!durationSec) problems.push(t("Shopee needs the video's length: wait for the video to load, or upload the file instead of a link."));
    else problems.push(...shopeeProblems(String(shopeeChannels[i].caption ?? ""), durationSec, t));
  });
  accounts.forEach((a, i) => {
    if (!a) problems.push(t("One of the channels isn't connected any more. Reload and pick again."));
    else if (a.status === "reconnect") problems.push(t("{channel} needs reconnecting first (Posts → Channels).", { channel: a.name ?? NAMES[a.platform] }));
    else problems.push(...channelProblems(a.platform, String(channels[i].caption ?? ""), String(channels[i].firstComment ?? ""), durationSec, t), ...settingsProblems(a.platform, cleanSettings(a.platform, channels[i].settings), durationSec, undefined, undefined, t), ...(photos ? photoProblems(a.platform, photos.length, t) : []));
  });
  if (problems.length) return bad(problems);

  // When: the TikTok post's time when there is one, otherwise the same choices as TikTok posting.
  let scheduledAt: Date | null = null;
  const tiktok = b.tiktokPostId ? await getUserPost(user.id, b.tiktokPostId) : null;
  if (b.tiktokPostId && !tiktok) return bad(t("The TikTok post wasn't found."));
  if (tiktok) scheduledAt = tiktok.scheduled_at ? new Date(tiktok.scheduled_at) : null;
  else if (b.when && b.when !== "draft") {
    if (b.when === "now") scheduledAt = new Date();
    else if (b.when === "recommended") scheduledAt = nextRecommendedSlot(new Date(), [], await postingHours());
    else {
      scheduledAt = new Date(b.when);
      if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60e3) return bad(t("Pick a time at least a minute from now."));
      if (scheduledAt.getTime() > Date.now() + 60 * 86400e3) return bad(t("Pick a time within the next 60 days."));
    }
  }
  if (scheduledAt) {
    for (const a of accounts) {
      if (!a || (a.platform === "facebook" && !facebookAsReel(durationSec))) continue;
      if ((await postsInDay(a.id, scheduledAt)) >= DAILY_CAP[a.platform])
        return bad(t("{channel} already has {n} posts in the 24 hours before that time ({app}'s daily limit). Pick another time.", { channel: a.name ?? NAMES[a.platform], n: DAILY_CAP[a.platform], app: NAMES[a.platform] }));
    }
  }

  // Post Everywhere costs credits per channel from the creator or seller wallet; drafts are free.
  const side = postSide(b.side);
  if (scheduledAt && !b.staged && !(await canPay(user.id, side, picked.length)))
    return bad(t("Not enough credits for these channels. Earn more or save as a draft."), 402);

  // With TikTok in the post, the channels get their own copy of the upload (TikTok deletes its file once it has posted). An
  // edit copies the video and comment image it kept too: the old post's files go once it is replaced.
  let storagePath: string | null = photos ? photos[0] : b.source === "upload" ? (b.storagePath as string) : null;
  let photoPaths = photos, igPhotoPaths = igPhotos;
  if (photoPaths) {
    // Each photo the same way: the channels' own copy when TikTok is in the post or an edit kept one still in use.
    const own = new Map<string, string>();
    for (const path of new Set([...photoPaths, ...(igPhotoPaths ?? [])])) {
      if (!tiktok && !(b.staged && (await fileInUse(path)))) own.set(path, path);
      else {
        const copy = `${user.id}/social/photos/${randomUUID()}.jpg`;
        await copyUpload(path, copy);
        own.set(path, copy);
      }
    }
    photoPaths = photoPaths.map((path) => own.get(path) as string);
    igPhotoPaths = igPhotoPaths?.map((path) => own.get(path) as string) ?? null;
    storagePath = photoPaths[0];
  } else if (storagePath && (tiktok || (b.staged && (await fileInUse(storagePath))))) {
    const copy = `${user.id}/social/${randomUUID()}.${storagePath.split(".").pop()}`;
    await copyUpload(storagePath, copy);
    storagePath = copy;
  }
  if (commentImage && b.staged && (await fileInUse(commentImage))) {
    const copy = `${user.id}/comment/${randomUUID()}.${commentImage.split(".").pop()}`;
    await copyUpload(commentImage, copy);
    commentImage = copy;
  }
  const groupId = randomUUID();
  const shopeeRows: NewSocialPost[] = shopeeChannels.map((c, i) => {
    const shop = shops[i]!;
    const s = (c.settings ?? {}) as { items?: unknown; duet?: unknown; stitch?: unknown; aigc?: unknown };
    // Sellers pick up to 6 of their own shop's products (Shopee checks they're the shop's); Shopee refuses other shops' products for affiliates.
    // TEST (owner, 23 Nov 2026, temporary): admins send products from affiliate accounts too, to see if Shopee now takes them.
    const items = (shop.role === "seller" || user.role === "admin") && Array.isArray(s.items) ? s.items.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0) : [];
    const settings: ShopeeSettings = { itemIds: [...new Set(items)].slice(0, 6), duet: s.duet !== false, stitch: s.stitch !== false, aigc: s.aigc === true };
    return {
      group_id: groupId,
      tiktok_post_id: tiktok?.id ?? null,
      user_id: user.id,
      account_id: null,
      shopee_connection_id: shop.id,
      account_name: shopeeLabel(shop),
      platform: "shopee",
      source: b.source as "upload" | "link",
      storage_path: storagePath,
      photo_paths: null,
      link_url: b.source === "link" ? (b.linkUrl as string) : null,
      duration_sec: durationSec,
      caption: String(c.caption ?? ""),
      first_comment: "",
      comment_image_path: null,
      status: scheduledAt && !b.staged ? "scheduled" : "draft",
      scheduled_at: scheduledAt?.toISOString() ?? null,
      next_attempt_at: scheduledAt?.toISOString() ?? null,
      settings,
    };
  });
  const rows: NewSocialPost[] = channels.map((c, i) => {
    const a = accounts[i]!;
    // Facebook drafts are for Reels only, never photos (S1).
    const settings = photoPaths && a.platform === "facebook" ? { draft: false } : cleanSettings(a.platform, c.settings);
    // A Facebook draft isn't public, so it gets no first comment.
    const draft = a.platform === "facebook" && (settings as { draft?: boolean }).draft === true;
    return {
      group_id: groupId,
      tiktok_post_id: tiktok?.id ?? null,
      user_id: user.id,
      account_id: a.id,
      shopee_connection_id: null,
      account_name: a.name ?? a.username,
      platform: a.platform,
      source: photoPaths ? "upload" : (b.source as "upload" | "link"),
      storage_path: a.platform === "instagram" && igPhotoPaths ? igPhotoPaths[0] : storagePath,
      photo_paths: a.platform === "instagram" && igPhotoPaths ? igPhotoPaths : photoPaths,
      link_url: !photoPaths && b.source === "link" ? (b.linkUrl as string) : null,
      duration_sec: durationSec,
      caption: String(c.caption ?? ""),
      first_comment: draft ? "" : String(c.firstComment ?? ""),
      comment_image_path: (a.platform === "facebook" && !draft) || a.platform === "threads" ? commentImage : null,
      status: scheduledAt && !b.staged ? "scheduled" : "draft",
      scheduled_at: scheduledAt?.toISOString() ?? null,
      next_attempt_at: scheduledAt?.toISOString() ?? null,
      settings,
    };
  });
  const posts = await insertSocialPosts([...rows, ...shopeeRows]);
  const due = posts.filter((p) => p.status === "scheduled");
  if (due.length) {
    const paid = await chargePosts(user.id, side, due.map((p) => ({ id: p.id, app: p.platform })), t);
    if (!paid.ok) {
      for (const p of due) await updateSocialPost(p.id, { status: "cancelled", next_attempt_at: null });
      return bad(paid.error, 402);
    }
  }
  return NextResponse.json({ posts }, { status: 201 });
}
