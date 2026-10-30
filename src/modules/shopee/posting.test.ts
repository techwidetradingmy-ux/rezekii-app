import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import type { SocialPostRow } from "../social/store.ts";
import { checkShopee, FIRST_POST, publishShopee } from "./posting.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.SHOPEE_PARTNER_ID = "2051121";
process.env.SHOPEE_PARTNER_KEY = "test-partner-key";
delete process.env.SHOPEE_SANDBOX;
delete process.env.SHOPEE_PROXY_URL;

const VIDEO = Buffer.from("fake mp4 bytes");
const conn = {
  id: "c1", user_id: "u1", shopee_user_id: "229441705", shop_id: "229437124", role: "seller", name: "Spinelief+", nickname: null, avatar_url: null,
  access_token_enc: encryptToken("access"), access_expires_at: new Date(Date.now() + 2 * 3600e3).toISOString(),
  refresh_token_enc: encryptToken("refresh"), refresh_expires_at: new Date(Date.now() + 20 * 86400e3).toISOString(),
  status: "active", connected_at: "2026-10-30T00:00:00Z", shop_access_token_enc: null, shop_access_expires_at: null, shop_refresh_token_enc: null, shop_refresh_expires_at: null,
};
const post = (over: Partial<SocialPostRow> = {}): SocialPostRow => ({
  id: "p1", group_id: "g1", tiktok_post_id: null, user_id: "u1", account_id: null, shopee_connection_id: "c1", account_name: "Spinelief+", platform: "shopee",
  source: "upload", storage_path: "u1/video.mp4", link_url: null, duration_sec: 6, caption: "Kusyen selesa #spinelief", first_comment: "", comment_image_path: null,
  status: "publishing", scheduled_at: "2026-10-31T00:00:00Z", next_attempt_at: null, attempts: 1, container_id: null, external_post_id: null, permalink: null,
  comment_status: "none", comment_id: null, comment_error: null, last_error: null, posted_at: null, settings: { itemIds: [4190238573, 12635744934], duet: true, stitch: false, aigc: false },
  live_checked_at: null, created_at: "2026-10-30T00:00:00Z", ...over,
});

/** Supabase gives the connection and a signed video link; Shopee answers each path from `shopee`. */
let calls: { url: URL; init: RequestInit }[] = [];
let shopee: Record<string, unknown> = {};
beforeEach(() => {
  calls = [];
  shopee = {};
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    if (url.pathname.startsWith("/rest/v1/shopee_connections")) return new Response(JSON.stringify([conn]));
    if (url.hostname === "db.test" && url.searchParams.get("token")) return new Response(VIDEO);
    if (url.pathname.startsWith("/storage/v1/object/sign/")) return new Response(JSON.stringify({ signedURL: "/object/sign/videos/u1/video.mp4?token=t" }));
    const body = shopee[url.pathname];
    return new Response(JSON.stringify(body ?? { error: "not_mocked", message: url.pathname }));
  }) as typeof fetch;
});
const shopeeCalls = () => calls.filter((c) => c.url.hostname === "partner.shopeemobile.com");

test("first try: the video goes up in parts (signed as the app only), and the post waits for Shopee to process it", async () => {
  shopee = {
    "/api/v2/media/init_video_upload": { error: "", response: { video_upload_id: "sg-v1", part_size: 10485760 } },
    "/api/v2/media/upload_video_part": { error: "" },
    "/api/v2/media/complete_video_upload": { error: "" },
  };
  assert.deepEqual(await publishShopee(post()), { kind: "sent", containerId: "sg-v1" });
  const [init, part, done] = shopeeCalls();
  assert.deepEqual(JSON.parse(String(init.init.body)), { business: 3, scene: 1, file_name: "p1.mp4", file_size: VIDEO.length, duration: 6 });
  assert.equal(init.url.searchParams.get("access_token"), null);
  const form = Buffer.from(part.init.body as Uint8Array).toString();
  assert.match(String((part.init.headers as Record<string, string>)["content-type"]), /^multipart\/form-data; boundary=/);
  assert.match(form, new RegExp(`name="part_md5"\\r\\n\\r\\n${createHash("md5").update(VIDEO).digest("hex")}`));
  assert.ok(form.includes(VIDEO.toString()));
  assert.equal(done.url.pathname, "/api/v2/media/complete_video_upload");
});

test("a video without a known length isn't sent (Shopee needs it)", async () => {
  const o = await publishShopee(post({ duration_sec: null }));
  assert.equal(o.kind, "failed");
  assert.equal(shopeeCalls().length, 0);
});

test("while Shopee processes the video, the post keeps waiting", async () => {
  shopee = { "/api/v2/media/get_video_upload_result": { error: "", response: { status: "TRANSCODING" } } };
  assert.deepEqual(await checkShopee(post({ container_id: "sg-v1" })), { kind: "waiting" });
});

test("once processed: first frame as cover, caption, the shop's products and settings, then posted, all signed as the user", async () => {
  shopee = {
    "/api/v2/media/get_video_upload_result": { error: "", response: { status: "SUCCEED" } },
    "/api/v2/video/get_cover_list": { error: "", response: { image_url_list: ["https://cf/1.jpg", "https://cf/2.jpg"] } },
    "/api/v2/video/edit_video_info": { error: "", response: { success_list: ["sg-v1"], failure_list: [] } },
    "/api/v2/video/post_video": { error: "", response: { success_list: [{ success_video_upload_id: "sg-v1", post_id: "POST1" }], failure_list: [] } },
  };
  assert.deepEqual(await checkShopee(post({ container_id: "sg-v1" })), { kind: "posted", postId: "POST1" });
  const edit = shopeeCalls().find((c) => c.url.pathname === "/api/v2/video/edit_video_info")!;
  assert.equal(edit.url.searchParams.get("user_id"), "229441705");
  assert.equal(edit.url.searchParams.get("access_token"), "access");
  assert.deepEqual(JSON.parse(String(edit.init.body)), {
    video_upload_list: [{ video_upload_id: "sg-v1", caption: "Kusyen selesa #spinelief", cover_image_url: "https://cf/1.jpg", item_info: [{ item_id: 4190238573 }, { item_id: 12635744934 }], allow_info: { allow_duet: true, allow_stitch: false }, scheduled_info: { scheduled_post: false } }],
    aigc_label: false,
  });
});

test("an account that hasn't accepted Shopee Video's terms fails for good with the Seller Centre steps", async () => {
  shopee = {
    "/api/v2/media/get_video_upload_result": { error: "", response: { status: "SUCCEED" } },
    "/api/v2/video/get_cover_list": { error: "", response: { image_url_list: ["https://cf/1.jpg"] } },
    "/api/v2/video/edit_video_info": { error: "", response: { success_list: ["sg-v1"], failure_list: [] } },
    "/api/v2/video/post_video": { error: "copyright_not_agree", message: "Not Agree Shopee videos Terms of Service" },
  };
  assert.deepEqual(await checkShopee(post({ container_id: "sg-v1" })), { kind: "failed", reason: FIRST_POST, final: true });
});

test("covers not ready yet (Shopee: upload video less than 1 min) means wait, not fail", async () => {
  shopee = {
    "/api/v2/media/get_video_upload_result": { error: "", response: { status: "SUCCEED" } },
    "/api/v2/video/get_cover_list": { error: "error_param", message: "upload video less than 1 min" },
  };
  assert.deepEqual(await checkShopee(post({ container_id: "sg-v1" })), { kind: "waiting" });
});
