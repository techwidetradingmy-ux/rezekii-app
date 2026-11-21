/**
 * TikTok Content Posting API (videos and photos). Uses the creator's Login Kit token (scopes video.publish / video.upload).
 * Direct post goes to the profile; inbox sends it to the creator's TikTok drafts to finish in the app.
 */
const API = "https://open.tiktokapis.com/v2/post/publish";

type Envelope<T> = { data?: T; error?: { code: string; message: string; log_id?: string } };
export type TikTokReply<T> = { data?: T; error?: { code: string; message: string; logId?: string } };

/**
 * TikTok sends post IDs as 19-digit numbers, longer than JavaScript numbers hold exactly (7710492037702765844 would become
 * 7710492037702766000), so numbers of 16+ digits are read as text. Owner's first public post, 21 Nov 2026.
 */
export function parseKeepingIds<T>(text: string): T {
  try {
    return JSON.parse(text.replace(/([[:,]\s*)(-?\d{16,})(?=\s*[,\]}])/g, '$1"$2"')) as T;
  } catch {
    return {} as T;
  }
}

async function call<T>(token: string, path: string, body: unknown): Promise<TikTokReply<T>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const json = parseKeepingIds<Envelope<T>>(await res.text().catch(() => ""));
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

/** TikTok's photo post_info: a title of up to 90 characters and the caption as the description (up to 4,000). */
export type PhotoInfo = {
  title: string;
  description: string;
  privacy_level?: PrivacyLevel;
  disable_comment?: boolean;
  auto_add_music?: boolean;
  brand_organic_toggle?: boolean;
  brand_content_toggle?: boolean;
};

/**
 * Starts a photo post (one photo or a carousel of up to 35): TikTok pulls each photo from its URL, which must be on a
 * domain verified for the app. Direct post publishes it; inbox sends it to the creator's TikTok drafts.
 */
export function initPhotoPost(token: string, mode: "direct" | "inbox", photoUrls: string[], info: PhotoInfo, isAigc = false) {
  return call<{ publish_id: string }>(token, "/content/init/", {
    media_type: "PHOTO",
    post_mode: mode === "direct" ? "DIRECT_POST" : "MEDIA_UPLOAD",
    post_info: mode === "direct" ? info : { title: info.title, description: info.description },
    source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: photoUrls },
    ...(isAigc ? { is_aigc: true } : {}),
  });
}

/** Sends one chunk to TikTok's upload URL. */
export async function uploadChunk(uploadUrl: string, bytes: Uint8Array<ArrayBuffer>, start: number, end: number, total: number, mime = "video/mp4"): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mime, "content-range": `bytes ${start}-${end}/${total}` },
    body: bytes,
    cache: "no-store",
    // 64 MB at a slow 1 MB/s still fits; the whole timer run has 300 s.
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok && res.status !== 206) throw new Error(`TikTok upload refused chunk ${start}-${end}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export type PublishStatus = {
  status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED";
  fail_reason?: string;
  publicaly_available_post_id?: (string | number)[];
};

export const fetchPublishStatus = (token: string, publishId: string) => call<PublishStatus>(token, "/status/fetch/", { publish_id: publishId });
