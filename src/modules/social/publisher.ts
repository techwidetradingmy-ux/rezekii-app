import { MetaError } from "../../integrations/meta/graph.ts";
import { commentOnFacebook, facebookPermalink, facebookVideo, finishFacebookReel, postFacebookVideo, startFacebookReel, uploadFacebookReel } from "../../integrations/meta/facebook.ts";
import { commentOnInstagram, createInstagramReel, instagramContainer, instagramPermalink, publishInstagram } from "../../integrations/meta/instagram.ts";
import { createThreadsReply, createThreadsVideo, publishThreads, threadsContainer, threadsPermalink } from "../../integrations/meta/threads.ts";
import { directLink } from "../posting/media.ts";
import { nextRetry } from "../posting/rules.ts";
import { freshToken, getAccount, markReconnect, type SocialAccount } from "./accounts.ts";
import { facebookAsReel } from "./rules.ts";
import { cleanSettings, type InstagramSettings, type ThreadsSettings } from "./settings.ts";
import { cleanUpGroup, signedVideoUrl, updateSocialPost, type SocialPostRow } from "./store.ts";

const STUCK_MS = 30 * 60e3;
/** A Facebook Reel saved as a draft on the Page (S1): nothing is public, so there's no link or first comment. */
const draftOf = (p: SocialPostRow) => p.platform === "facebook" && p.settings?.draft === true;
const msg = (err: unknown) => (err instanceof Error ? (err.name === "TimeoutError" ? `A call took too long and was stopped (${err.message}).` : err.message) : String(err));

/** A try failed: schedule the next try (5 and 25 minutes later), or mark it Failed after the 3rd. Keeps the channel's reason. */
async function recordFailure(p: SocialPostRow, reason: string, opts: { final?: boolean; clearContainer?: boolean } = {}): Promise<string> {
  const next = opts.final ? null : nextRetry(p.attempts, new Date());
  await updateSocialPost(p.id, {
    status: next ? "scheduled" : "failed",
    next_attempt_at: next?.toISOString() ?? null,
    last_error: reason,
    ...(opts.clearContainer ? { container_id: null } : {}),
  });
  if (!next) await cleanUpGroup(p.group_id);
  return next ? "retry" : "failed";
}

/** Meta says the sign-in is no longer valid: the channel shows "Reconnect" and this post fails with that reason. */
async function handleError(p: SocialPostRow, acc: SocialAccount | null, err: unknown, clearContainer = false): Promise<string> {
  if (err instanceof MetaError && err.needsReconnect && acc) {
    await markReconnect(acc.id);
    return recordFailure(p, `${acc.name ?? "This channel"} needs reconnecting in Rezekii (Posts → Channels).`, { final: true });
  }
  return recordFailure(p, msg(err), { clearContainer });
}

async function accountFor(p: SocialPostRow): Promise<SocialAccount | null> {
  return p.account_id ? getAccount(p.account_id) : null;
}

/**
 * One try at a claimed channel post: hands the video to the channel (which fetches it from a signed link) and leaves the
 * post "processing" until the channel has it ready. A post that already has a container resumes instead of posting again.
 */
export async function publishSocialPost(p: SocialPostRow): Promise<string> {
  const acc = await accountFor(p);
  if (!acc) return recordFailure(p, "Channel disconnected", { final: true });
  if (acc.status === "reconnect") return recordFailure(p, `${acc.name ?? "This channel"} needs reconnecting in Rezekii (Posts → Channels).`, { final: true });
  if (p.container_id) {
    await updateSocialPost(p.id, { status: "processing" });
    return "resumed";
  }
  try {
    const token = await freshToken(acc);
    const video = p.storage_path ? await signedVideoUrl(p.storage_path) : directLink(p.link_url ?? "");
    let container: string;
    if (p.platform === "facebook") {
      if (facebookAsReel(p.duration_sec)) {
        container = await startFacebookReel(acc.external_id, token);
        await updateSocialPost(p.id, { container_id: container });
        await uploadFacebookReel(container, token, video);
        await finishFacebookReel(acc.external_id, token, container, p.caption, draftOf(p));
      } else container = await postFacebookVideo(acc.external_id, token, video, p.caption);
    } else if (p.platform === "instagram") {
      const s = cleanSettings("instagram", p.settings) as InstagramSettings;
      container = await createInstagramReel(acc.external_id, token, video, p.caption, s);
    } else {
      const s = cleanSettings("threads", p.settings) as ThreadsSettings;
      container = await createThreadsVideo(acc.external_id, token, video, p.caption, s);
    }
    await updateSocialPost(p.id, { status: "processing", container_id: container, last_error: null });
    return "sent";
  } catch (err) {
    return handleError(p, acc, err, true);
  }
}

async function markPosted(p: SocialPostRow, externalId: string, permalink: string | null): Promise<string> {
  await updateSocialPost(p.id, { status: "posted", external_post_id: externalId, permalink, posted_at: new Date().toISOString(), next_attempt_at: null, last_error: null, comment_status: p.first_comment.trim() ? "pending" : "none" });
  if (!p.first_comment.trim()) await cleanUpGroup(p.group_id);
  return "posted";
}

/** Asks the channel how a processing post is doing; publishes it once ready (Instagram and Threads need a publish call). */
export async function checkSocialProcessing(p: SocialPostRow): Promise<string> {
  const acc = await accountFor(p);
  if (!acc || !p.container_id) return recordFailure(p, acc ? "Nothing to check." : "Channel disconnected", { final: !acc });
  try {
    const token = await freshToken(acc);
    if (p.platform === "facebook") {
      const v = await facebookVideo(p.container_id, token);
      const st = v.status;
      if (st?.video_status === "error") return recordFailure(p, st.publishing_phase?.errors?.[0]?.message ?? "Facebook couldn't process the video.", { clearContainer: true });
      if (st?.publishing_phase?.status === "complete" || st?.video_status === "ready") return markPosted(p, v.post_id ?? p.container_id, draftOf(p) ? null : facebookPermalink(v.permalink_url));
    } else if (p.platform === "instagram") {
      const c = await instagramContainer(p.container_id, token);
      if (c.status_code === "FINISHED") {
        const id = await publishInstagram(acc.external_id, token, p.container_id);
        return markPosted(p, id, await instagramPermalink(id, token).catch(() => null));
      }
      if (c.status_code === "PUBLISHED") return markPosted(p, p.external_post_id ?? p.container_id, p.permalink);
      if (c.status_code === "ERROR" || c.status_code === "EXPIRED") return recordFailure(p, `Instagram couldn't process the video${c.status ? ` (${c.status})` : ""}.`, { clearContainer: true });
    } else {
      const c = await threadsContainer(p.container_id, token);
      if (c.status === "FINISHED") {
        const id = await publishThreads(acc.external_id, token, p.container_id);
        return markPosted(p, id, await threadsPermalink(id, token).catch(() => null));
      }
      if (c.status === "PUBLISHED") return markPosted(p, p.external_post_id ?? p.container_id, p.permalink);
      if (c.status === "ERROR" || c.status === "EXPIRED") return recordFailure(p, c.error_message ? `Threads: ${c.error_message}` : "Threads couldn't process the video.", { clearContainer: true });
    }
    if (Date.now() - new Date(p.scheduled_at ?? p.created_at).getTime() > STUCK_MS) return recordFailure(p, "The channel didn't finish processing the video within 30 minutes.", { final: true });
    return "processing";
  } catch (err) {
    return handleError(p, acc, err);
  }
}

/** The first comment, once the post is live: by the Page, by the Instagram account, or as the account's own Threads reply. */
export async function postFirstComment(p: SocialPostRow): Promise<string> {
  const acc = await accountFor(p);
  const fail = async (reason: string) => {
    await updateSocialPost(p.id, { comment_status: "failed", comment_error: reason });
    await cleanUpGroup(p.group_id);
    return "comment failed";
  };
  if (!acc || !p.external_post_id) return fail(acc ? "The post has no id to comment on." : "Channel disconnected");
  try {
    const token = await freshToken(acc);
    const text = p.first_comment.trim();
    let id: string;
    if (p.platform === "facebook") id = await commentOnFacebook(p.container_id ?? p.external_post_id, token, text);
    else if (p.platform === "instagram") id = await commentOnInstagram(p.external_post_id, token, text);
    else {
      const reply = await createThreadsReply(acc.external_id, token, text, p.external_post_id);
      for (let i = 0; i < 5; i++) {
        const c = await threadsContainer(reply, token);
        if (c.status === "FINISHED") break;
        if (c.status === "ERROR") throw new Error(c.error_message ?? "Threads couldn't create the reply.");
        await new Promise((r) => setTimeout(r, 2000));
      }
      id = await publishThreads(acc.external_id, token, reply);
    }
    await updateSocialPost(p.id, { comment_status: "posted", comment_id: id, comment_error: null });
    await cleanUpGroup(p.group_id);
    return "comment posted";
  } catch (err) {
    if (err instanceof MetaError && err.needsReconnect) await markReconnect(acc.id);
    return fail(msg(err));
  }
}
