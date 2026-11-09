import { test } from "node:test";
import assert from "node:assert/strict";
import { facebookCommentAction, facebookComments, instagramCommentAction, instagramComments, noPermission } from "./comments.ts";
import { MetaError } from "./graph.ts";

type Call = { url: string; method: string; body: string };
async function withMeta<T>(answer: (url: string) => unknown, run: () => Promise<T>): Promise<{ result: T; calls: Call[] }> {
  const calls: Call[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, method: init.method ?? "GET", body: init.body ? String(init.body) : "" });
    return new Response(JSON.stringify(answer(url)));
  }) as typeof fetch;
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = real;
  }
}

test("Facebook: the Page's posts come with their newest comments first, replies oldest first, and the Page's own marked", async () => {
  const { result, calls } = await withMeta(
    () => ({
      data: [
        {
          id: "p1_1", message: "New stock", created_time: "2026-11-08T03:00:00+0000", permalink_url: "https://facebook.com/p1/posts/1", full_picture: "https://img/1.jpg",
          comments: {
            summary: { total_count: 4 },
            data: [
              { id: "c1", message: "Older", created_time: "2026-11-08T04:00:00+0000", from: { id: "u1", name: "Aina" }, can_hide: true, can_remove: true },
              {
                id: "c2", message: "Harga?", created_time: "2026-11-08T05:00:00+0000", from: { id: "u2", name: "Siti" }, is_hidden: true, can_hide: true, can_remove: true,
                comments: { data: [{ id: "r2", message: "DM ya", created_time: "2026-11-08T06:00:00+0000", from: { id: "p1", name: "Shop" }, can_hide: false, can_remove: true }, { id: "r1", message: "Me too", created_time: "2026-11-08T05:30:00+0000" }] },
              },
            ],
          },
        },
      ],
    }),
    () => facebookComments("p1", "page-token"),
  );
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/v25.0/p1/published_posts");
  assert.match(url.searchParams.get("fields")!, /comments\.order\(reverse_chronological\)\.limit\(25\)\.summary\(true\)\{id,message,created_time,from\{id,name\},is_hidden,can_hide,can_remove,comments\.limit\(10\)/);
  const [p] = result;
  assert.deepEqual([p.total, p.url, p.thumb], [4, "https://facebook.com/p1/posts/1", "https://img/1.jpg"]);
  assert.deepEqual(p.comments.map((c) => c.id), ["c2", "c1"]);
  assert.deepEqual(p.comments[0].replies.map((r) => [r.id, r.mine, r.author]), [["r1", false, null], ["r2", true, "Shop"]]);
  assert.deepEqual([p.comments[0].hidden, p.comments[0].canHide, p.comments[0].replies[1].canHide], [true, true, false]);
});

test("Facebook: reply, hide, show again and delete go to the comment itself", async () => {
  const { calls } = await withMeta(() => ({ id: "new1", success: true }), async () => {
    assert.equal(await facebookCommentAction("c2", "tok", "reply", "Terima kasih!"), "new1");
    await facebookCommentAction("c2", "tok", "hide");
    await facebookCommentAction("c2", "tok", "unhide");
    await facebookCommentAction("c2", "tok", "delete");
  });
  assert.deepEqual(calls.map((c) => [c.method, new URL(c.url).pathname]), [["POST", "/v25.0/c2/comments"], ["POST", "/v25.0/c2"], ["POST", "/v25.0/c2"], ["DELETE", "/v25.0/c2"]]);
  assert.equal(new URLSearchParams(calls[0].body).get("message"), "Terima kasih!");
  assert.deepEqual([new URLSearchParams(calls[1].body).get("is_hidden"), new URLSearchParams(calls[2].body).get("is_hidden")], ["true", "false"]);
});

test("Instagram: comments by username, the account's own replies marked, own comments can't be hidden", async () => {
  const { result, calls } = await withMeta(
    () => ({
      data: [
        {
          id: "m1", caption: "Reel", timestamp: "2026-11-08T03:00:00+0000", permalink: "https://instagram.com/reel/1", thumbnail_url: "https://img/t.jpg", media_type: "VIDEO", comments_count: 2,
          comments: { data: [{ id: "k1", text: "Nice", timestamp: "2026-11-08T04:00:00+0000", username: "aina", hidden: false, replies: { data: [{ id: "k2", text: "Thanks!", timestamp: "2026-11-08T04:10:00+0000", username: "shop.my" }] } }] },
        },
        { id: "m2", media_type: "IMAGE", media_url: "https://img/2.jpg", comments_count: 0 },
      ],
    }),
    () => instagramComments("ig1", "ig-token", "shop.my"),
  );
  const url = new URL(calls[0].url);
  assert.equal(url.host, "graph.instagram.com");
  assert.equal(url.pathname, "/v25.0/ig1/media");
  assert.deepEqual(result.map((p) => [p.id, p.total, p.thumb]), [["m1", 2, "https://img/t.jpg"], ["m2", 0, "https://img/2.jpg"]]);
  const [k1] = result[0].comments;
  assert.deepEqual([k1.author, k1.mine, k1.canHide, k1.replies[0].mine, k1.replies[0].canHide], ["aina", false, true, true, false]);
});

test("Instagram: reply goes to /replies, hide sends hide=true or false, delete is a DELETE", async () => {
  const { calls } = await withMeta(() => ({ id: "k9", success: true }), async () => {
    assert.equal(await instagramCommentAction("k1", "tok", "reply", "Thanks"), "k9");
    await instagramCommentAction("k1", "tok", "hide");
    await instagramCommentAction("k1", "tok", "unhide");
    await instagramCommentAction("k1", "tok", "delete");
  });
  assert.deepEqual(calls.map((c) => [c.method, new URL(c.url).pathname]), [["POST", "/v25.0/k1/replies"], ["POST", "/v25.0/k1"], ["POST", "/v25.0/k1"], ["DELETE", "/v25.0/k1"]]);
  assert.deepEqual([new URLSearchParams(calls[1].body).get("hide"), new URLSearchParams(calls[2].body).get("hide")], ["true", "false"]);
});

test("a missing permission is told apart from an ended sign-in", () => {
  assert.equal(noPermission(new MetaError("(#10) Application does not have permission for this action", 10)), true);
  assert.equal(noPermission(new MetaError("(#200) Requires pages_read_user_content permission", 200)), true);
  assert.equal(noPermission(new MetaError("Error validating access token", 190)), false);
  assert.equal(noPermission(new Error("network")), false);
});
