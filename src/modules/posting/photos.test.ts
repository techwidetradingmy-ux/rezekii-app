import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cleanPhotoPaths, filesOf } from "./photos.ts";
import { checkPhotoLink, photoLink } from "./photo-links.ts";
import { instagramCrop, instagramMisfits, photoProblems } from "../social/rules.ts";
import { toPhotoInfo } from "./rules.ts";

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const U = "0e0f59b1-bd9c-429b-bd0d-e9e6f74ca62a";
const P = (n: number, social = false) => `${U}/${social ? "social/" : ""}photos/00000000-0000-4000-8000-00000000000${n}.jpg`;

test("a photo post's photos must be this user's photo uploads, 1 to 35 of them", () => {
  assert.deepEqual(cleanPhotoPaths(U, [P(1), P(2, true)]), [P(1), P(2, true)]);
  assert.equal(cleanPhotoPaths(U, []), null);
  assert.equal(cleanPhotoPaths(U, [`${U}/clip.mp4`]), null);
  assert.equal(cleanPhotoPaths(U, [P(1).replace(U, "11111111-1111-4111-8111-111111111111")]), null);
  assert.equal(cleanPhotoPaths(U, Array(36).fill(P(1))), null);
  assert.deepEqual(filesOf({ storage_path: P(1), photo_paths: [P(1), P(2)] }), [P(1), P(2)]);
  assert.deepEqual(filesOf({ storage_path: `${U}/v.mp4`, photo_paths: null }), [`${U}/v.mp4`]);
});

test("TikTok's photo links are on rezekii.com, signed, and stop working when changed or out of time", () => {
  const link = new URL(photoLink(P(3), 3, "https://rezekii.com"));
  assert.equal(link.origin + link.pathname, "https://rezekii.com/api/media/photo");
  const q = link.searchParams;
  assert.equal(checkPhotoLink(q.get("p"), q.get("e"), q.get("s")), P(3));
  assert.equal(checkPhotoLink(P(4), q.get("e"), q.get("s")), null, "another photo with the same signature");
  assert.equal(checkPhotoLink(q.get("p"), String(Number(q.get("e")) + 60), q.get("s")), null, "a longer time");
  assert.equal(checkPhotoLink(q.get("p"), q.get("e"), q.get("s"), Date.now() + 4 * 3600e3), null, "after it ran out");
  assert.equal(checkPhotoLink("../secrets.jpg", q.get("e"), q.get("s")), null);
});

test("Instagram crops: the middle 4:5 of a tall photo, the middle 1.91:1 of a wide one, nothing for one that fits", () => {
  assert.deepEqual(instagramCrop(1080, 1920), { x: 0, y: 285, w: 1080, h: 1350 });
  assert.deepEqual(instagramCrop(2000, 1000), { x: 45, y: 0, w: 1910, h: 1000 });
  assert.equal(instagramCrop(1080, 1350), null);
  assert.equal(instagramCrop(0, 0), null);
});

test("each app's photo limit, and Instagram's 4:5 to 1.91:1 shapes", () => {
  assert.deepEqual(photoProblems("tiktok", 35), []);
  assert.deepEqual(photoProblems("instagram", 21), ["Instagram takes up to 20 photos in one post. This post has 21."]);
  assert.deepEqual(photoProblems("facebook", 35), []);
  assert.deepEqual(photoProblems("facebook", 36), ["Facebook takes up to 35 photos in one post. This post has 36."]);
  // 1080×1920 (9:16) is too tall; 1080×1350 (4:5), 1080×1080 and 1910×1000 fit; a photo not sized yet isn't counted.
  assert.deepEqual(instagramMisfits([{ w: 1080, h: 1350 }, { w: 1080, h: 1920 }, { w: 1080, h: 1080 }, { w: 1910, h: 1000 }, { w: 0, h: 0 }, { w: 2000, h: 1000 }]), [2, 6]);
});

test("TikTok photo post info: the caption is the description, comments follow the choice, no title", () => {
  const info = { privacy_level_options: ["PUBLIC_TO_EVERYONE" as const], comment_disabled: false, duet_disabled: false, stitch_disabled: false, max_video_post_duration_sec: 600 };
  const choice = { mode: "direct" as const, caption: "Rak dapur 3 tingkat #rumah", privacyLevel: "PUBLIC_TO_EVERYONE" as const, allowComments: true, allowDuet: false, allowStitch: false, promo: true, brandOrganic: false, brandedContent: true, isAigc: false };
  assert.deepEqual(toPhotoInfo(choice, info), { title: "", description: "Rak dapur 3 tingkat #rumah", privacy_level: "PUBLIC_TO_EVERYONE", disable_comment: false, auto_add_music: true, brand_organic_toggle: false, brand_content_toggle: true });
  assert.equal(toPhotoInfo({ ...choice, allowComments: true }, { ...info, comment_disabled: true }).disable_comment, true);
});
