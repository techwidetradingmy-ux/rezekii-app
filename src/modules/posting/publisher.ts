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
  try {
    const token = await freshTikTokToken(post.tiktok_open_id);
    const info = await queryCreatorInfo(token);
    if (info.error || !info.data) return await recordFailure(post, `TikTok says this account can't post right now (${info.error?.message ?? "no creator info"}).`);
    const problems = postProblems(choiceFromRow(post), info.data);
    if (problems.length) return await recordFailure(post, problems.join(" "));

    const media = await openMedia({ storagePath: post.storage_path, linkUrl: post.link_url });
    const plan = planChunks(media.size);
    const init = await initVideoPost(token, post.mode, plan, post.mode === "direct" ? toPostInfo(choiceFromRow(post), info.data) : undefined);
    if (init.error || !init.data) return await recordFailure(post, `TikTok refused the post: ${init.error?.message ?? "no upload address"} (${init.error?.code ?? "?"}).`);

    for (let i = 0; i < plan.totalChunks; i++) {
      const { start, end } = chunkRange(plan, i);
      await uploadChunk(init.data.upload_url, await media.read(start, end), start, end, plan.videoSize, media.mime);
    }
    await updatePost(post.id, { status: "processing", publish_id: init.data.publish_id, video_size: media.size, last_error: null });
    return "uploaded";
  } catch (err) {
    return recordFailure(post, err instanceof Error ? err.message : String(err));
  }
}

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
