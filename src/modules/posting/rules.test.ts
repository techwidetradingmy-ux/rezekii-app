import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkRange, planChunks, type CreatorInfo } from "../../integrations/tiktok/posting.ts";
import { consentLine, nextRecommendedSlot, nextRetry, postProblems, statusFromTikTok, toPostInfo, type PostChoice } from "./rules.ts";

const info: CreatorInfo = { privacy_level_options: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"], comment_disabled: false, duet_disabled: true, stitch_disabled: false, max_video_post_duration_sec: 180 };
const base: PostChoice = { mode: "direct", caption: "hi", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: false, allowDuet: false, allowStitch: false, promo: false, brandOrganic: false, brandedContent: false, isAigc: false, durationSec: 42 };

test("post rules: privacy has no default and must be one TikTok allows", () => {
  assert.deepEqual(postProblems(base, info), []);
  assert.match(postProblems({ ...base, privacyLevel: null }, info)[0], /Choose who can view/);
  assert.match(postProblems({ ...base, privacyLevel: "FOLLOWER_OF_CREATOR" }, info)[0], /doesn't allow/);
  assert.deepEqual(postProblems({ ...base, mode: "inbox", privacyLevel: null }, info), []);
});

test("post rules: disclosure, branded content and length", () => {
  assert.match(postProblems({ ...base, promo: true }, info)[0], /indicate if your content promotes/);
  assert.deepEqual(postProblems({ ...base, promo: true, brandOrganic: true }, info), []);
  assert.match(postProblems({ ...base, promo: true, brandedContent: true, privacyLevel: "SELF_ONLY" }, info).join(" "), /cannot be set to private/);
  assert.match(postProblems({ ...base, durationSec: 200 }, info)[0], /3 min max/);
  assert.match(postProblems({ ...base, caption: "x".repeat(2201) }, info)[0], /2200/);
});

test("post info: interactions off by default and forced off when the creator disabled them", () => {
  const pi = toPostInfo({ ...base, allowComments: true, allowDuet: true }, info);
  assert.equal(pi.disable_comment, false);
  assert.equal(pi.disable_duet, true, "duet is disabled in the creator's TikTok settings");
  assert.equal(pi.disable_stitch, true, "off unless turned on");
  assert.equal(pi.brand_content_toggle, false);
  assert.equal(toPostInfo({ ...base, promo: true, brandedContent: true }, info).brand_content_toggle, true);
  assert.equal(toPostInfo({ ...base, promo: false, brandedContent: true }, info).brand_content_toggle, false, "toggles only count with the disclosure switch on");
});

test("consent line mentions the Branded Content Policy only for branded content", () => {
  assert.match(consentLine({ promo: true, brandedContent: true }), /Branded Content Policy/);
  assert.doesNotMatch(consentLine({ promo: true, brandedContent: false }), /Branded/);
});

test("recommended times: next free 6 AM / 12 PM / 8 PM Malaysia time", () => {
  const myt = (s: string) => new Date(s + "+08:00");
  assert.equal(nextRecommendedSlot(myt("2026-10-12T09:00:00"), []).toISOString(), myt("2026-10-12T12:00:00").toISOString());
  assert.equal(nextRecommendedSlot(myt("2026-10-12T11:55:00"), []).toISOString(), myt("2026-10-12T20:00:00").toISOString(), "needs 10 minutes' lead");
  assert.equal(nextRecommendedSlot(myt("2026-10-12T09:00:00"), [myt("2026-10-12T12:00:00")]).toISOString(), myt("2026-10-12T20:00:00").toISOString());
  assert.equal(nextRecommendedSlot(myt("2026-10-12T21:00:00"), []).toISOString(), myt("2026-10-13T06:00:00").toISOString());
});

test("retries: 3 tries over about 30 minutes, then failed", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  assert.equal(nextRetry(1, now)?.toISOString(), "2026-10-12T00:05:00.000Z");
  assert.equal(nextRetry(2, now)?.toISOString(), "2026-10-12T00:25:00.000Z");
  assert.equal(nextRetry(3, now), null);
});

test("TikTok status mapping", () => {
  assert.equal(statusFromTikTok("PUBLISH_COMPLETE"), "posted");
  assert.equal(statusFromTikTok("SEND_TO_USER_INBOX"), "sent_to_inbox");
  assert.equal(statusFromTikTok("FAILED"), "failed");
  assert.equal(statusFromTikTok("PROCESSING_UPLOAD"), null);
});

test("chunks: one piece up to 64 MB, otherwise 10 MB chunks with the remainder in the last", () => {
  const MB = 1024 * 1024;
  assert.deepEqual(planChunks(3 * MB), { videoSize: 3 * MB, chunkSize: 3 * MB, totalChunks: 1 });
  assert.deepEqual(planChunks(50 * MB), { videoSize: 50 * MB, chunkSize: 50 * MB, totalChunks: 1 });
  const big = planChunks(105 * MB + 7);
  assert.equal(big.totalChunks, 10);
  assert.deepEqual(chunkRange(big, 0), { start: 0, end: 10 * MB - 1 });
  assert.deepEqual(chunkRange(big, 9), { start: 90 * MB, end: 105 * MB + 6 });
});
