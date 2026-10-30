import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getUserPost } from "@/modules/posting/store.ts";
import { nextRecommendedSlot } from "@/modules/posting/rules.ts";
import { postingHours } from "@/modules/posting/times.ts";
import { getAccount } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { NAMES, channelProblems, facebookAsReel, shopeeProblems, shopeeProduct } from "@/modules/social/rules.ts";
import { getShopee } from "@/modules/shopee/connections.ts";
import type { ShopeeSettings } from "@/modules/shopee/posting.ts";
import { cleanSettings, settingsProblems } from "@/modules/social/settings.ts";
import { fileInUse } from "@/modules/posting/edit.ts";
import { copyUpload, insertSocialPosts, listSocialPosts, postsInDay, type NewSocialPost } from "@/modules/social/store.ts";

export const dynamic = "force-dynamic";

/** Daily caps per account (rolling 24 h): Instagram 100, Threads 250, Facebook Reels 30. */
const DAILY_CAP = { instagram: 100, threads: 250, facebook: 30 };

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ posts: [] });
  return NextResponse.json({ posts: await listSocialPosts(user.id) });
}

type ChannelIn = { accountId?: string; caption?: string; firstComment?: string; settings?: unknown };
type Body = { source?: "upload" | "link"; storagePath?: string; linkUrl?: string; durationSec?: number; when?: string; tiktokPostId?: string; commentImagePath?: string; channels?: ChannelIn[]; staged?: boolean };
const bad = (error: string | string[], status = 400) => NextResponse.json({ error }, { status });

/** A Shopee account picked in New post comes as "shopee:<connection id>". */
const SHOPEE_KEY = /^shopee:([0-9a-f-]{36})$/;

/**
 * Schedules the Meta and Shopee channels of one New post. Each channel gets its own post (its own caption and first comment), all in
 * one group with the TikTok post when there is one. With a TikTok post, the channels go out at the TikTok post's time.
 * `staged`: an edit being saved, held as drafts with their time until /api/posts/swap puts them in place of the old post.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return bad("Sign in first.", 401);
  if (!canUseSocial(user)) return bad("Not available yet.", 403);
  const b = (await req.json().catch(() => ({}))) as Body;
  if (b.source === "upload" ? !b.storagePath?.startsWith(`${user.id}/`) : b.source === "link" ? !/^https:\/\/\S+$/.test(b.linkUrl ?? "") : true)
    return bad("Add a video: upload one or paste an https link.");
  let commentImage = b.commentImagePath ?? null;
  if (commentImage && !new RegExp(`^${user.id}/comment/[0-9a-f-]{36}\\.(jpg|png)$`).test(commentImage)) return bad("The comment image upload wasn't found. Add it again.");
  const picked = (b.channels ?? []).filter((c) => c.accountId);
  if (!picked.length) return bad("Pick at least one Facebook, Instagram, Threads or Shopee channel.");
  const channels = picked.filter((c) => !SHOPEE_KEY.test(String(c.accountId)));
  const shopeeChannels = picked.filter((c) => SHOPEE_KEY.test(String(c.accountId)));
  const durationSec = typeof b.durationSec === "number" ? b.durationSec : null;

  const accounts = await Promise.all(channels.map((c) => getAccount(String(c.accountId), user.id)));
  const shops = await Promise.all(shopeeChannels.map((c) => getShopee(String(c.accountId).replace("shopee:", ""), user.id)));
  const problems: string[] = [];
  shops.forEach((c, i) => {
    if (!c) problems.push("One of the channels isn't connected any more. Reload and pick again.");
    else if (c.status === "reconnect") problems.push(`${c.name ?? "Shopee"} needs reconnecting first (Posts → Channels).`);
    else if (!durationSec) problems.push("Shopee needs the video's length: wait for the video to load, or upload the file instead of a link.");
    else problems.push(...shopeeProblems(String(shopeeChannels[i].caption ?? ""), durationSec));
  });
  accounts.forEach((a, i) => {
    if (!a) problems.push("One of the channels isn't connected any more. Reload and pick again.");
    else if (a.status === "reconnect") problems.push(`${a.name ?? NAMES[a.platform]} needs reconnecting first (Posts → Channels).`);
    else problems.push(...channelProblems(a.platform, String(channels[i].caption ?? ""), String(channels[i].firstComment ?? ""), durationSec), ...settingsProblems(a.platform, cleanSettings(a.platform, channels[i].settings), durationSec));
  });
  if (problems.length) return bad(problems);

  // When: the TikTok post's time when there is one, otherwise the same choices as TikTok posting.
  let scheduledAt: Date | null = null;
  const tiktok = b.tiktokPostId ? await getUserPost(user.id, b.tiktokPostId) : null;
  if (b.tiktokPostId && !tiktok) return bad("The TikTok post wasn't found.");
  if (tiktok) scheduledAt = tiktok.scheduled_at ? new Date(tiktok.scheduled_at) : null;
  else if (b.when && b.when !== "draft") {
    if (b.when === "now") scheduledAt = new Date();
    else if (b.when === "recommended") scheduledAt = nextRecommendedSlot(new Date(), [], await postingHours());
    else {
      scheduledAt = new Date(b.when);
      if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60e3) return bad("Pick a time at least a minute from now.");
      if (scheduledAt.getTime() > Date.now() + 60 * 86400e3) return bad("Pick a time within the next 60 days.");
    }
  }
  if (scheduledAt) {
    for (const a of accounts) {
      if (!a || (a.platform === "facebook" && !facebookAsReel(durationSec))) continue;
      if ((await postsInDay(a.id, scheduledAt)) >= DAILY_CAP[a.platform])
        return bad(`${a.name ?? NAMES[a.platform]} already has ${DAILY_CAP[a.platform]} posts in the 24 hours before that time (${NAMES[a.platform]}'s daily limit). Pick another time.`);
    }
  }

  // With TikTok in the post, the channels get their own copy of the upload (TikTok deletes its file once it has posted). An
  // edit copies the video and comment image it kept too: the old post's files go once it is replaced.
  let storagePath: string | null = b.source === "upload" ? (b.storagePath as string) : null;
  if (storagePath && (tiktok || (b.staged && (await fileInUse(storagePath))))) {
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
    const s = (c.settings ?? {}) as { product?: unknown; duet?: unknown; stitch?: unknown; aigc?: unknown };
    // Sellers can show their own shop's product under the video; Shopee refuses other shops' products for affiliates.
    const product = shop.role === "seller" && typeof s.product === "string" ? shopeeProduct(s.product) : null;
    const settings: ShopeeSettings = { itemId: product && product.shopId === shop.shop_id ? Number(product.itemId) : null, duet: s.duet !== false, stitch: s.stitch !== false, aigc: s.aigc === true };
    return {
      group_id: groupId,
      tiktok_post_id: tiktok?.id ?? null,
      user_id: user.id,
      account_id: null,
      shopee_connection_id: shop.id,
      account_name: shop.name ?? (shop.role === "seller" ? "Shopee shop" : "Shopee affiliate"),
      platform: "shopee",
      source: b.source as "upload" | "link",
      storage_path: storagePath,
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
    const settings = cleanSettings(a.platform, c.settings);
    // A Facebook draft isn't public, so it gets no first comment (S1).
    const draft = a.platform === "facebook" && (settings as { draft?: boolean }).draft === true;
    return {
      group_id: groupId,
      tiktok_post_id: tiktok?.id ?? null,
      user_id: user.id,
      account_id: a.id,
      shopee_connection_id: null,
      account_name: a.name ?? a.username,
      platform: a.platform,
      source: b.source as "upload" | "link",
      storage_path: storagePath,
      link_url: b.source === "link" ? (b.linkUrl as string) : null,
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
  return NextResponse.json({ posts: await insertSocialPosts([...rows, ...shopeeRows]) }, { status: 201 });
}
