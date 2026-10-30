import { createHash, randomBytes } from "node:crypto";
import { ShopeeError, shopeeCall } from "./client.ts";

/**
 * Shopee Video (guide 706): the file goes up in parts through the Media upload calls (Public: signed with the app only),
 * Shopee processes it, then the Video calls (signed as the user, seller or affiliate) set the cover, caption and product
 * and post it. Checked live on 30 Oct 2026 with a seller and an affiliate account.
 */
const asUser = (token: string, userId: string) => ({ query: { access_token: token, user_id: userId }, signWith: [token, userId] });

/** Uploads the whole file and hands it to Shopee for processing; returns Shopee's video_upload_id. */
export async function uploadShopeeVideo(data: Buffer, fileName: string, durationSec: number): Promise<string> {
  const init = await shopeeCall<{ response: { video_upload_id: string; part_size: number } }>("/api/v2/media/init_video_upload", {
    body: { business: 3, scene: 1, file_name: fileName, file_size: data.length, duration: Math.round(durationSec) },
  });
  const { video_upload_id: id, part_size: size } = init.response;
  for (let seq = 0, off = 0; off < data.length; seq++, off += size) {
    const part = data.subarray(off, off + size);
    const b = `----rezekii${randomBytes(8).toString("hex")}`;
    const field = (n: string, v: string) => `--${b}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
    const form = Buffer.concat([
      Buffer.from(field("video_upload_id", id) + field("part_seq", String(seq)) + field("part_md5", createHash("md5").update(part).digest("hex"))),
      Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="part_content"; filename="part${seq}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      part,
      Buffer.from(`\r\n--${b}--\r\n`),
    ]);
    await shopeeCall("/api/v2/media/upload_video_part", { form: { data: form, type: `multipart/form-data; boundary=${b}` } });
  }
  await shopeeCall("/api/v2/media/complete_video_upload", { body: { video_upload_id: id } });
  return id;
}

/** "ready" once Shopee has processed the upload (it answers SUCCEED, not the documented SUCCEEDED), "failed" with its reason. */
export async function shopeeUploadState(id: string): Promise<{ state: "ready" | "processing" | "failed"; reason?: string }> {
  const r = await shopeeCall<{ response: { status: string; reason?: string } }>("/api/v2/media/get_video_upload_result", { query: { video_upload_id: id } });
  const s = r.response.status;
  if (s.startsWith("SUCCEED")) return { state: "ready" };
  if (s === "FAILED" || s === "CANCELLED") return { state: "failed", reason: r.response.reason };
  return { state: "processing" };
}

/** Frames Shopee offers as the cover; empty while Shopee is still preparing them ("upload video less than 1 min"). */
export async function shopeeCovers(token: string, userId: string, id: string): Promise<string[]> {
  const user = asUser(token, userId);
  try {
    return (await shopeeCall<{ response: { image_url_list?: string[] } }>("/api/v2/video/get_cover_list", { ...user, query: { ...user.query, video_upload_id: id } })).response.image_url_list ?? [];
  } catch (err) {
    if (err instanceof ShopeeError && /less than 1 min|data not found/i.test(err.message)) return [];
    throw err;
  }
}

export type ShopeeVideoInfo = { caption: string; cover: string; itemId: number | null; duet: boolean; stitch: boolean; aigc: boolean };

/** Sets the caption, cover, product and settings (the video becomes a draft on the account), then posts it. Returns the post_id. */
export async function postShopeeVideo(token: string, userId: string, id: string, v: ShopeeVideoInfo): Promise<string> {
  const user = asUser(token, userId);
  const edit = await shopeeCall<{ response: { failure_list?: { failed_reason?: string }[] } }>("/api/v2/video/edit_video_info", {
    ...user,
    body: {
      video_upload_list: [{ video_upload_id: id, caption: v.caption, cover_image_url: v.cover, item_info: v.itemId ? [{ item_id: v.itemId }] : [], allow_info: { allow_duet: v.duet, allow_stitch: v.stitch }, scheduled_info: { scheduled_post: false } }],
      aigc_label: v.aigc,
    },
  });
  const editFail = edit.response.failure_list?.[0];
  if (editFail) throw new ShopeeError(editFail.failed_reason || "Shopee didn't accept the video details.", "edit_failed");
  const post = await shopeeCall<{ response: { success_list?: { post_id: string }[]; failure_list?: { failed_reason?: string }[] } }>("/api/v2/video/post_video", { ...user, body: { video_upload_id_list: [id] } });
  const postId = post.response.success_list?.[0]?.post_id;
  if (!postId) throw new ShopeeError(post.response.failure_list?.[0]?.failed_reason || "Shopee didn't post the video.", "post_failed");
  return postId;
}

/** A posted video's status: 300 posted, 400 deleted (also 200 draft, 500 scheduled, 600 scheduled but failed). */
export async function shopeeVideoStatus(token: string, userId: string, postId: string): Promise<number> {
  const user = asUser(token, userId);
  return (await shopeeCall<{ response: { status: number } }>("/api/v2/video/get_video_detail", { ...user, query: { ...user.query, post_id: postId } })).response.status;
}
