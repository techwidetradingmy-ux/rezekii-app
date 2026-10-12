/**
 * TikTok Content Posting API (video). Uses the creator's Login Kit token (scopes video.publish / video.upload).
 * Direct post goes to the profile; inbox sends it to the creator's TikTok drafts to finish in the app.
 */
const API = "https://open.tiktokapis.com/v2/post/publish";

type Envelope<T> = { data?: T; error?: { code: string; message: string; log_id?: string } };
export type TikTokReply<T> = { data?: T; error?: { code: string; message: string; logId?: string } };

async function call<T>(token: string, path: string, body: unknown): Promise<TikTokReply<T>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  const e = json.error;
  return { data: json.data, error: e && e.code !== "ok" ? { code: e.code, message: e.message, logId: e.log_id } : !res.ok ? { code: `http_${res.status}`, message: res.statusText } : undefined };
}

export type PrivacyLevel = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

export type CreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: PrivacyLevel[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

/** Fresh account settings; TikTok's rules say to read these every time the posting screen opens and before posting. */
export const queryCreatorInfo = (token: string) => call<CreatorInfo>(token, "/creator_info/query/", {});

export type PostInfo = {
  title: string;
  privacy_level: PrivacyLevel;
  disable_comment: boolean;
  disable_duet: boolean;
  disable_stitch: boolean;
  brand_organic_toggle: boolean;
  brand_content_toggle: boolean;
  is_aigc: boolean;
};

export type ChunkPlan = { videoSize: number; chunkSize: number; totalChunks: number };

const MB = 1024 * 1024;
/**
 * TikTok's chunk rules: a video up to 64 MB may go in one piece (under 5 MB it must); otherwise chunks of 5–64 MB,
 * total = floor(size / chunk), and the last chunk takes the remainder (up to 128 MB).
 */
export function planChunks(videoSize: number, chunkSize = 10 * MB): ChunkPlan {
  if (videoSize <= 64 * MB) return { videoSize, chunkSize: videoSize, totalChunks: 1 };
  return { videoSize, chunkSize, totalChunks: Math.floor(videoSize / chunkSize) };
}

/** Byte range [start, end] (inclusive) of chunk `i` under `plan`. */
export function chunkRange(plan: ChunkPlan, i: number): { start: number; end: number } {
  const start = i * plan.chunkSize;
  const end = i === plan.totalChunks - 1 ? plan.videoSize - 1 : start + plan.chunkSize - 1;
  return { start, end };
}

/** Starts a direct post (or, with mode "inbox", a draft) and returns where to upload the file. */
export function initVideoPost(token: string, mode: "direct" | "inbox", plan: ChunkPlan, postInfo?: PostInfo) {
  const source_info = { source: "FILE_UPLOAD", video_size: plan.videoSize, chunk_size: plan.chunkSize, total_chunk_count: plan.totalChunks };
  return mode === "direct"
    ? call<{ publish_id: string; upload_url: string }>(token, "/video/init/", { post_info: postInfo, source_info })
    : call<{ publish_id: string; upload_url: string }>(token, "/inbox/video/init/", { source_info });
}

/** Sends one chunk to TikTok's upload URL. */
export async function uploadChunk(uploadUrl: string, bytes: Uint8Array<ArrayBuffer>, start: number, end: number, total: number, mime = "video/mp4"): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mime, "content-length": String(bytes.byteLength), "content-range": `bytes ${start}-${end}/${total}` },
    body: bytes,
    cache: "no-store",
  });
  if (!res.ok && res.status !== 206) throw new Error(`TikTok upload refused chunk ${start}-${end}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export type PublishStatus = {
  status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED";
  fail_reason?: string;
  publicaly_available_post_id?: (string | number)[];
};

export const fetchPublishStatus = (token: string, publishId: string) => call<PublishStatus>(token, "/status/fetch/", { publish_id: publishId });
