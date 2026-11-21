import { test } from "node:test";
import assert from "node:assert/strict";
import { postFacebookPhotos } from "./facebook.ts";
import { createInstagramPhotos } from "./instagram.ts";
import { createThreadsPhotos } from "./threads.ts";
import { initPhotoPost } from "../tiktok/posting.ts";

type Call = { path: string; form: Record<string, string> };
async function withApi<T>(run: () => Promise<T>): Promise<{ result: T; calls: Call[] }> {
  const calls: Call[] = [];
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const body = init.body ? String(init.body) : "";
    const form = body.startsWith("{") ? (JSON.parse(body) as Record<string, string>) : Object.fromEntries(new URLSearchParams(body));
    calls.push({ path: new URL(String(input)).pathname, form });
    n++;
    return new Response(JSON.stringify(String(input).includes("tiktokapis") ? { data: { publish_id: "pub1" }, error: { code: "ok" } } : { id: `id${n}`, post_id: `page_post${n}` }));
  }) as typeof fetch;
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = real;
  }
}

test("Facebook: one photo is posted with its caption; several are uploaded unpublished, then posted together", async () => {
  const one = await withApi(() => postFacebookPhotos("p1", "tok", ["https://s/1.jpg"], "Hi"));
  assert.equal(one.result, "page_post1");
  assert.deepEqual(one.calls.map((c) => [c.path, c.form.url, c.form.caption]), [["/v25.0/p1/photos", "https://s/1.jpg", "Hi"]]);
  const many = await withApi(() => postFacebookPhotos("p1", "tok", ["https://s/1.jpg", "https://s/2.jpg"], "Hi"));
  assert.equal(many.result, "id3");
  assert.deepEqual(many.calls.map((c) => [c.path, c.form.published]), [["/v25.0/p1/photos", "false"], ["/v25.0/p1/photos", "false"], ["/v25.0/p1/feed", undefined]]);
  assert.deepEqual([many.calls[2].form.message, many.calls[2].form["attached_media[0]"], many.calls[2].form["attached_media[1]"]], ["Hi", '{"media_fbid":"id1"}', '{"media_fbid":"id2"}']);
});

test("Instagram: one photo is one container; a carousel gets item containers, then the carousel with the caption", async () => {
  const one = await withApi(() => createInstagramPhotos("ig1", "tok", ["https://s/1.jpg"], "Cap", { tags: ["aina"], collaborators: ["brand"] }));
  assert.deepEqual([one.calls[0].form.image_url, one.calls[0].form.caption, one.calls[0].form.user_tags, one.calls[0].form.collaborators], ["https://s/1.jpg", "Cap", '[{"username":"aina","x":0.5,"y":0.5}]', '["brand"]']);
  const many = await withApi(() => createInstagramPhotos("ig1", "tok", ["https://s/1.jpg", "https://s/2.jpg"], "Cap", { tags: ["aina"] }));
  assert.equal(many.result, "id3");
  assert.deepEqual(many.calls.map((c) => [c.form.is_carousel_item, c.form.media_type, c.form.caption]), [["true", undefined, undefined], ["true", undefined, undefined], [undefined, "CAROUSEL", "Cap"]]);
  assert.deepEqual([many.calls[0].form.user_tags, many.calls[1].form.user_tags, many.calls[2].form.children], ['[{"username":"aina","x":0.5,"y":0.5}]', undefined, "id1,id2"]);
});

test("Threads: one photo is an IMAGE post; a carousel gets IMAGE items, then the carousel with the text and settings", async () => {
  const one = await withApi(() => createThreadsPhotos("me", "tok", ["https://s/1.jpg"], "Hey", { replies: "accounts_you_follow", topic: "Rumah" }));
  assert.deepEqual([one.calls[0].form.media_type, one.calls[0].form.image_url, one.calls[0].form.text, one.calls[0].form.reply_control, one.calls[0].form.topic_tag], ["IMAGE", "https://s/1.jpg", "Hey", "accounts_you_follow", "Rumah"]);
  const many = await withApi(() => createThreadsPhotos("me", "tok", ["https://s/1.jpg", "https://s/2.jpg"], "Hey"));
  assert.deepEqual(many.calls.map((c) => [c.form.media_type, c.form.is_carousel_item, c.form.children]), [["IMAGE", "true", undefined], ["IMAGE", "true", undefined], ["CAROUSEL", undefined, "id1,id2"]]);
});

test("TikTok: a photo post asks TikTok to pull the photos, as a direct post or to drafts", async () => {
  const info = { title: "", description: "Cap", privacy_level: "PUBLIC_TO_EVERYONE" as const, disable_comment: false, auto_add_music: true };
  const direct = await withApi(() => initPhotoPost("tok", "direct", ["https://rezekii.com/a", "https://rezekii.com/b"], info, true));
  assert.equal(direct.result.data?.publish_id, "pub1");
  assert.equal(direct.calls[0].path, "/v2/post/publish/content/init/");
  assert.deepEqual(direct.calls[0].form, { media_type: "PHOTO", post_mode: "DIRECT_POST", post_info: info, source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: ["https://rezekii.com/a", "https://rezekii.com/b"] }, is_aigc: true } as never);
  const inbox = await withApi(() => initPhotoPost("tok", "inbox", ["https://rezekii.com/a"], info));
  assert.deepEqual((inbox.calls[0].form as unknown as { post_mode: string; post_info: object }).post_mode, "MEDIA_UPLOAD");
  assert.deepEqual((inbox.calls[0].form as unknown as { post_info: object }).post_info, { title: "", description: "Cap" });
});
