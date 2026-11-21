"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import type { Channel } from "@/components/publish/rules";
import type { MyPost, PostStatus, PubBrand, PubChannel, PublishSetup } from "./mock-publish";
import { makeT, type T } from "@/lib/i18n/lang";
import type { Recipe } from "@/modules/social/recipe.ts";

/**
 * Post Everywhere on real data for signed-in accounts (owner, 31 Oct 2026): her connected channels, brands and credits, real
 * uploads and posts through rezekii.com's posting (TikTok, then the other apps as one group), and the Content Calendar from her
 * real posts. Signed out, the screens keep their sample data. Messages come in her language when the page passes its translator.
 */

/** English, as written, when no translator is passed. */
const EN: T = makeT(null);

export type Side = "creator" | "seller";
export type LiveSetup = { channels: PubChannel[]; brands: PubBrand[]; last: string[]; credits: number; free?: boolean };

/** The page's own setup with her real channels, brands and credits. No sample post, no pretend video check. */
export async function loadSetup(base: PublishSetup, side: Side): Promise<PublishSetup> {
  const r = await fetch(`/api/v2/publish?part=setup&side=${side}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Couldn't load your channels. Please refresh.");
  const d = (await r.json()) as LiveSetup;
  return { ...base, channels: d.channels, brands: d.brands, last: d.last, credits: d.credits, free: !!d.free, connectable: [], precheck: false, live: side };
}

const json = async <T,>(r: Response, fallback: string): Promise<T> => {
  const d = (await r.json().catch(() => ({}))) as T & { error?: string | string[] };
  if (!r.ok) throw new Error(Array.isArray(d.error) ? d.error.join(" ") : d.error || fallback);
  return d;
};
const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** Uploads the video (or one photo of a photo post) straight to storage, reporting progress; returns its stored path. */
export async function upload(file: File, onPct: (pct: number) => void, t: T = EN, kind?: "photo"): Promise<string> {
  const u = await json<{ path?: string; uploadUrl?: string }>(await post("/api/posts/upload", { type: file.type, size: file.size, kind }), t("Upload couldn't start."));
  if (!u.uploadUrl || !u.path) throw new Error(t("Upload couldn't start."));
  const ok = await new Promise<boolean>((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", u.uploadUrl as string);
    x.setRequestHeader("content-type", file.type);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => resolve(x.status >= 200 && x.status < 300);
    x.onerror = () => resolve(false);
    x.send(file);
  });
  if (!ok) throw new Error(t("The upload didn't finish. Try again."));
  return u.path;
}

/** TikTok's rules for this account, asked fresh each time New post opens for it (TikTok requires it). */
export type CreatorInfo = { creator_nickname?: string; creator_username?: string; creator_avatar_url?: string; privacy_level_options: string[]; comment_disabled?: boolean; duet_disabled?: boolean; stitch_disabled?: boolean; max_video_post_duration_sec?: number };
export async function creatorInfo(openId: string, t: T = EN): Promise<CreatorInfo> {
  return json<CreatorInfo>(await fetch(`/api/posts/creator-info?account=${encodeURIComponent(openId)}`, { cache: "no-store" }), t("Couldn't reach TikTok. Check your connection and try again."));
}

export type TikTokChoice = { mode: "direct" | "inbox"; caption: string; privacyLevel: string | null; allowComments: boolean; allowDuet: boolean; allowStitch: boolean; promo: boolean; brandOrganic: boolean; brandedContent: boolean; isAigc: boolean; durationSec: number | null };
export type OtherChannel = { accountId: string; caption: string; firstComment: string; settings: Record<string, unknown> };

/**
 * Sends one New post: TikTok first (if picked), then the other apps as one group at TikTok's time. Each scheduled channel takes
 * credits from the wallet. Returns when it goes out (null for a draft) and the post's key (the TikTok post or the group).
 * `staged`: an edit, held as a draft with its time until swapEdit puts it in place of the old post.
 */
export async function sendPost(p: {
  side: Side; when: string; durationSec: number | null; staged?: boolean; commentImagePath?: string;
  // A video (an upload or a link), or a photo post's photos in order with Instagram's cut-to-fit copies when some don't fit it.
  video: { source: "upload" | "link"; storagePath?: string; linkUrl?: string } | { photoPaths: string[]; instagramPhotoPaths?: string[] };
  tiktok?: { account: string; choice: TikTokChoice }; others: OtherChannel[];
}, t: T = EN): Promise<{ at: string | null; key: string | null }> {
  let tiktokPost: { id: string; scheduled_at: string | null } | null = null;
  if (p.tiktok) {
    const d = await json<{ post?: { id: string; scheduled_at: string | null } }>(
      await post("/api/posts", { ...p.tiktok.choice, ...("photoPaths" in p.video ? { photoPaths: p.video.photoPaths } : p.video), when: p.when, consent: true, account: p.tiktok.account, side: p.side, staged: p.staged }),
      t("TikTok post couldn't be saved."),
    );
    tiktokPost = d.post ?? null;
  }
  let at = tiktokPost?.scheduled_at ?? null;
  let key = tiktokPost?.id ?? null;
  if (p.others.length) {
    try {
      const d = await json<{ posts?: { scheduled_at: string | null; group_id: string }[] }>(
        await post("/api/social/posts", { ...p.video, durationSec: p.durationSec, when: p.when, tiktokPostId: tiktokPost?.id, side: p.side, staged: p.staged, commentImagePath: p.commentImagePath, channels: p.others }),
        t("The other channels couldn't be saved."),
      );
      at ??= d.posts?.[0]?.scheduled_at ?? null;
      // With TikTok in the post, its id is the key (the group points to it).
      key ??= d.posts?.[0]?.group_id ?? null;
    } catch (e) {
      const why = e instanceof Error ? t(e.message) : "";
      throw new Error(tiktokPost ? (why ? t("The TikTok post was saved, but {error}", { error: why }) : t("The TikTok post was saved, but the other channels weren't.")) : why || t("Didn't go through."));
    }
  }
  return { at, key };
}

/** Saving an edit: puts the held, changed post (`next`) in place of the old one, as long as it hasn't started sending. */
export async function swapEdit(old: string, next: string, side: Side, t: T = EN): Promise<void> {
  await json(await post("/api/posts/swap", { old, new: next, side }), t("Your changes couldn't be saved. Please try again."));
}

/** Keeps what was typed with the post it made, so Edit (and Reuse) can fill New Post in again. Best effort. */
export function keepRecipe(key: string, recipe: Recipe): void {
  void fetch("/api/social/recipes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, recipe }), keepalive: true }).catch(() => {});
}

/* ---------------- Content Calendar ---------------- */

type BoardChannel = { id: string; kind: Channel; account: string; name: string; state: "draft" | "scheduled" | "posting" | "posted" | "failed" | "fbdraft" | "removed"; note: string; permalink: string | null; canCancel: boolean; canRetry: boolean };
type BoardPost = { key: string; at: string | null; caption: string; channels: BoardChannel[] };

const STATE: Record<BoardChannel["state"], PostStatus> = { draft: "draft", scheduled: "scheduled", posting: "sending", posted: "posted", failed: "failed", fbdraft: "pagedraft", removed: "removed" };
const myt = (iso: string) => new Date(Date.parse(iso) + 8 * 3600_000).toISOString();

/** Her real posts in the calendar's shape. Each channel keeps its own post id, for Cancel and Try again. */
export async function loadPosts(): Promise<MyPost[]> {
  const r = await fetch("/api/v2/publish?part=posts", { cache: "no-store" });
  if (!r.ok) throw new Error("Couldn't load your posts. Please refresh.");
  const d = (await r.json()) as { posts: BoardPost[] };
  return d.posts.map((p) => {
    const at = p.at ? myt(p.at) : "";
    return {
      id: p.key,
      date: at.slice(0, 10),
      time: at.slice(11, 16),
      caption: p.caption,
      comment: "",
      cover: "",
      seconds: 0,
      real: true,
      targets: p.channels.map((c) => ({
        key: c.account,
        status: STATE[c.state],
        reason: c.state === "failed" ? c.note : undefined,
        fix: c.canRetry ? ("Retry" as const) : undefined,
        postId: c.id,
        canCancel: c.canCancel,
        permalink: c.permalink,
      })),
    };
  });
}

/** Cancels one channel's post before it goes out (its credits come back). */
export async function cancelChannel(app: Channel, postId: string, t: T = EN): Promise<void> {
  const r = app === "tiktok" ? await post(`/api/posts/${postId}/cancel`, {}) : await post(`/api/social/posts/${postId}`, { action: "cancel" });
  await json(r, t("Couldn't cancel. Please try again."));
}

/** Tries a failed channel again (it costs its credits again). */
export async function retryChannel(app: Channel, postId: string, t: T = EN): Promise<void> {
  const r = app === "tiktok" ? await post(`/api/posts/${postId}/retry`, {}) : await post(`/api/social/posts/${postId}`, { action: "retry" });
  await json(r, t("Couldn't try again. Please try again."));
}

/* ---------------- Hooks for the pages ---------------- */

/** The page's setup: sample when signed out, her real one when signed in ("wait" while it loads). */
export function useLiveSetup(base: PublishSetup, side: Side): PublishSetup | "wait" | "error" {
  const { live } = useDemo();
  const [real, setReal] = useState<PublishSetup | "wait" | "error">("wait");
  useEffect(() => {
    if (live) loadSetup(base, side).then(setReal).catch(() => setReal("error"));
  }, [live, base, side]);
  return live ? real : base;
}

/** The calendar's posts: sample when signed out, her real ones when signed in. */
export function useLivePosts(base: MyPost[]): MyPost[] | "wait" | "error" {
  const { live } = useDemo();
  const [real, setReal] = useState<MyPost[] | "wait" | "error">("wait");
  useEffect(() => {
    if (live) loadPosts().then(setReal).catch(() => setReal("error"));
  }, [live]);
  return live ? real : base;
}
