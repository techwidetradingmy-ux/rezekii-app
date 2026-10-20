import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanRecipe, recipeFromPosts } from "./recipe.ts";

test("M7: a saved recipe comes back as New post typed it; anything malformed falls back to New post's defaults", () => {
  const r = cleanRecipe({ channels: ["tiktok:abc", "acc-1", "acc-1", 5], main: "Hook", tags: "#a", comment: "Ada soalan?", link: "https://s.shopee.com.my/x", cta: "Beli di sini 👉", remind: false, captions: { facebook: "FB only", tiktok: 7 }, place: { threads: { caption: true, comment: false }, facebook: "no" }, topic: "Kek", fbDraft: true, igFeed: false, igTrial: "auto", collaborators: "@a", tagged: "@b", replies: "followers_only" });
  assert.deepEqual(r, { channels: ["tiktok:abc", "acc-1"], main: "Hook", tags: "#a", comment: "Ada soalan?", link: "https://s.shopee.com.my/x", cta: "Beli di sini 👉", remind: false, captions: { facebook: "FB only" }, comments: {}, place: { threads: { caption: true, comment: false } }, topic: "Kek", fbDraft: true, igFeed: false, igTrial: "auto", collaborators: "@a", tagged: "@b", replies: "followers_only" });
  assert.equal(cleanRecipe({ igTrial: "public", replies: "nobody" })?.igTrial, "off");
  assert.equal(cleanRecipe({ replies: "nobody" })?.replies, "everyone");
  assert.equal(cleanRecipe("nope"), null);
});

test("M7: a post made before recipes were kept brings back each app's caption, comment and settings as it went out", () => {
  const r = recipeFromPosts([
    { account_id: "fb-1", platform: "facebook", caption: "FB caption", first_comment: "Link 👇", link_reminder: true, settings: { draft: true } },
    { account_id: "fb-2", platform: "facebook", caption: "FB caption", first_comment: "Link 👇", link_reminder: true, settings: { draft: true } },
    { account_id: "ig-1", platform: "instagram", caption: "IG caption", first_comment: "", link_reminder: false, settings: { feed: false, collaborators: ["brand"], tags: ["shopee_my"], trial: "manual" } },
    { account_id: "th-1", platform: "threads", caption: "TH caption", first_comment: "Reply", link_reminder: false, settings: { replies: "mentioned_only", topic: "Kek" } },
  ], { tiktok_open_id: "abc", caption: "TT caption" });
  assert.deepEqual(r.channels, ["tiktok:abc", "fb-1", "fb-2", "ig-1", "th-1"]);
  assert.equal(r.main, "TT caption");
  assert.deepEqual(r.captions, { tiktok: "TT caption", facebook: "FB caption", instagram: "IG caption", threads: "TH caption" });
  assert.deepEqual(r.comments, { facebook: "Link 👇", threads: "Reply" });
  assert.deepEqual([r.remind, r.fbDraft, r.igFeed, r.igTrial, r.collaborators, r.tagged, r.replies, r.topic], [true, true, false, "manual", "@brand", "@shopee_my", "mentioned_only", "Kek"]);
  assert.deepEqual(recipeFromPosts([], { tiktok_open_id: "abc", caption: "Only TikTok" }).channels, ["tiktok:abc"]);
});
