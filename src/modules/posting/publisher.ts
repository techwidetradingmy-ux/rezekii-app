import { chunkRange, fetchPublishStatus, initVideoPost, planChunks, queryCreatorInfo, uploadChunk } from "../../integrations/tiktok/posting.ts";
import { deleteUpload, openMedia } from "./media.ts";
import { nextRetry, postProblems, statusFromTikTok, toPostInfo } from "./rules.ts";
import { choiceFromRow, freshTikTokToken, updatePost, type PostRow } from "./store.ts";

/** A try failed: schedule the next try, or mark the post Failed after the last one. Keeps TikTok's reason. */
export async function recordFailure(post: PostRow, reason: string): Promise<"retry" | "failed"> {
  const next = nextRetry(post.attempts, new Date());
  await updatePost(post.id, next ? { status: "scheduled", next_attempt_at: next.toISOString(), last_error: reason } : { status: "failed", next_attempt_at: null, last_error: reason });
  return next ? "retry" : "failed";
}

/**
 * One try at a claimed post: re-reads the account's creator info (TikTok's rule), checks the post again,
 * uploads the video in chunks and leaves the post "processing" until TikTok confirms.
 */
export async function publishPost(post: PostRow): Promise<string> {
  const step = (s: string) => console.log(`[posting] ${post.id} try ${post.attempts}: ${s}`);
  try {
    const token = await freshTikTokToken(post.tiktok_open_id);
    const info = await queryCreatorInfo(token);
    step(info.error ? `creator info error ${info.error.code}` : "creator info ok");
    if (info.error || !info.data) return await recordFailure(post, `TikTok says this account can't post right now (${info.error?.message ?? "no creator info"}).`);
    const problems = postProblems(choiceFromRow(post), info.data);
    if (problems.length) return await recordFailure(post, problems.join(" "));

    const media = await openMedia({ storagePath: post.storage_path, linkUrl: post.link_url });
    const plan = planChunks(media.size);
    step(`video ${media.size} bytes in ${plan.totalChunks} chunk(s); starting TikTok upload`);
    const init = await initVideoPost(token, post.mode, plan, post.mode === "direct" ? toPostInfo(choiceFromRow(post), info.data) : undefined);
    if (init.error || !init.data) return await recordFailure(post, (init.error && TIKTOK_REASONS[init.error.code]) ?? `TikTok refused the post: ${init.error?.message ?? "no upload address"} (${init.error?.code ?? "?"}).`);
    step(`TikTok upload started (publish ${init.data.publish_id})`);

    for (let i = 0; i < plan.totalChunks; i++) {
      const { start, end } = chunkRange(plan, i);
      await uploadChunk(init.data.upload_url, await media.read(start, end), start, end, plan.videoSize, media.mime);
      step(`chunk ${i + 1}/${plan.totalChunks} sent`);
    }
    await updatePost(post.id, { status: "processing", publish_id: init.data.publish_id, video_size: media.size, last_error: null });
    return "uploaded";
  } catch (err) {
    const msg = err instanceof Error ? (err.name === "TimeoutError" ? "A call took too long and was stopped (" + err.message + ")." : err.message) : String(err);
    step(`failed: ${msg}`);
    return recordFailure(post, msg);
  }
}

/** TikTok's error codes that need the creator to act, in plain words. */
const TIKTOK_REASONS: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts: "TikTok only lets Rezekii post to private TikTok accounts until it approves Rezekii. Set your TikTok account to private to post now, or wait for TikTok's approval.",
  spam_risk_too_many_posts: "TikTok says this account has posted too much today. Try again tomorrow.",
  spam_risk_user_banned_from_posting: "TikTok has stopped this account from posting for now.",
};

const STUCK_MS = 30 * 60e3;

/** Asks TikTok how a processing post is doing; finishes it (and deletes the upload) once TikTok confirms. */
export async function checkProcessing(post: PostRow): Promise<string> {
  if (!post.publish_id) return recordFailure(post, "No TikTok upload to check.");
  const token = await freshTikTokToken(post.tiktok_open_id);
  const r = await fetchPublishStatus(token, post.publish_id);
  if (r.error || !r.data) return "unknown";
  const done = statusFromTikTok(r.data.status);
  if (done === "failed") return recordFailure(post, `TikTok couldn't publish it: ${r.data.fail_reason ?? "no reason given"}.`);
  if (done) {
    await updatePost(post.id, { status: done, posted_at: new Date().toISOString(), tiktok_post_id: r.data.publicaly_available_post_id?.[0]?.toString() ?? null, next_attempt_at: null });
    if (post.storage_path) await deleteUpload(post.storage_path);
    return done;
  }
  if (Date.now() - new Date(post.updated_at).getTime() > STUCK_MS) return recordFailure(post, "TikTok didn't confirm the post within 30 minutes.");
  return "processing";
}
