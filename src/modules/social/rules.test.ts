import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLACEMENT, autoCaption, autoComment, channelProblems, channelWarnings, facebookAsReel, postedCaption, threadsLength } from "./rules.ts";

const MAIN = "Umur 40 ke atas, lutut selalu rasa berat bila naik tangga? Ramai sangka itu biasa. Link produk ada di bawah.\n#krilloil #sendi #wellnessmalaysia #a #b #c #d";
const LINK = "https://s.shopee.com.my/3g1kTMj9Ah";

test("C3b: TikTok gets a short caption pointing to the yellow basket, no link, at most 5 hashtags", () => {
  const t = autoCaption("tiktok", `${MAIN} ${LINK}`);
  assert.equal(t, "Umur 40 ke atas, lutut selalu rasa berat bila naik tangga? Produk dekat beg kuning. #krilloil #sendi #wellnessmalaysia #a #b");
  assert.doesNotMatch(t, /https?:/);
});

test("C3b: Instagram has no link, points to the bio, at most 5 hashtags", () => {
  const t = autoCaption("instagram", MAIN);
  assert.match(t, /Ramai sangka itu biasa\. Link dekat bio\./);
  assert.equal(t.match(/#/g)?.length, 5);
});

test("C3b: Threads moves the link to the first comment; no hashtags in the text (the topic goes separately)", () => {
  const t = autoCaption("threads", MAIN);
  assert.match(t, /Link produk ada dalam komen\./);
  assert.equal(t.match(/#/g), null);
  assert.equal(autoComment("threads", LINK), `Link produk 👇\n${LINK}`);
});

test("C3b/C4: Facebook keeps the link sentence, puts the link in the caption and the first comment", () => {
  const t = autoCaption("facebook", MAIN);
  assert.match(t, /Link produk ada di bawah\./);
  assert.equal(postedCaption("facebook", t, LINK, DEFAULT_PLACEMENT.facebook), `${t}\n${LINK}`);
  assert.equal(autoComment("facebook", LINK), `Dapatkan di sini: ${LINK}`);
});

test("C4: no link → no link comment; TikTok never gets the link; changing placement changes the copy", () => {
  assert.equal(autoComment("threads", ""), "");
  assert.equal(postedCaption("tiktok", "x", LINK, { caption: true, comment: true }), "x");
  assert.match(autoCaption("facebook", MAIN, { caption: false, comment: false }), /naik tangga\? Ramai sangka itu biasa\.\s*#krilloil/);
  assert.equal(autoComment("instagram", LINK, { caption: false, comment: true }), LINK);
});

test("C2/C3: Threads counts an emoji as 2–4 and blocks over 500; caption limits per channel", () => {
  assert.equal(threadsLength("ab"), 2);
  assert.equal(threadsLength("👇"), 4);
  assert.deepEqual(channelProblems("threads", "x".repeat(500), ""), []);
  assert.match(channelProblems("threads", "x".repeat(499) + "👇", "")[0], /500 characters/);
  assert.match(channelProblems("instagram", "x".repeat(2201), "")[0], /2,200/);
  assert.match(channelProblems("threads", "ok", "y".repeat(501))[0], /first comment/);
  assert.match(channelProblems("threads", "a https://1 b https://2 https://3 https://4 https://5 https://6", "")[0], /at most 5 links/);
});

test("C7: video length per channel; Facebook Reels only for 3–90 s", () => {
  assert.match(channelProblems("threads", "ok", "", 301)[0], /5 minutes/);
  assert.match(channelProblems("instagram", "ok", "", 2)[0], /3 seconds/);
  assert.equal(facebookAsReel(32), true);
  assert.equal(facebookAsReel(120), false);
  assert.equal(facebookAsReel(null), false);
});

test("an empty main caption gives empty channel versions", () => {
  for (const ch of ["tiktok", "facebook", "instagram", "threads"] as const) assert.equal(autoCaption(ch, "  "), "");
});

test("C2b: hashtag warnings don't block", () => {
  assert.match(channelWarnings("instagram", "#a #b #c #d #e #f")[0], /5 hashtags/);
  assert.match(channelWarnings("threads", "#a")[0], /Topic box/);
  assert.deepEqual(channelWarnings("facebook", "#a #b #c #d #e #f #g"), []);
});
