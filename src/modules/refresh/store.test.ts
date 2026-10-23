import { test } from "node:test";
import assert from "node:assert/strict";
import { detailOf } from "../rankings/build.ts";
import { mergeCreatorRows, trimDetail } from "./store.ts";

test("a trimmed creator profile gives Rankings exactly the same details, without the fields nothing reads", () => {
  const loc = ["MY", "OTHER", "SG", "ID", "TH", "PH", "VN", "BN"].map((key, i) => ({ key, value: String(0.5 / (i + 1)) }));
  const full = {
    nickname: "Tina", bio_description: "WhatsApp 012-3456789 · tina@mail.com", gmv: { amount: "1234.5", currency: "USD" }, gmv_range: { formatted_range: "US$1K-10K", min: 1 },
    video_gmv: { amount: "800" }, live_gmv: { amount: "434.5" }, units_sold: "321", avg_commission_rate: "12.5", ec_video_count: "40", ec_live_count: "3",
    category_ids: ["600001", "601450"], category_gmv_distribution: [{ category_id: "601450", value: "0.7" }, { category_id: "-1", value: "0.3" }],
    content_gmv_distribution: [{ content_type: "video_gmv", value: "800" }, { content_type: "live_gmv", value: "434.5" }],
    follower_age: [{ key: "25-34", value: "0.6" }, { key: "18-24", value: "0.4" }], follower_gender: [{ key: "female", value: "0.8" }, { key: "male", value: "0.2" }],
    follower_location: loc, brand_collaboration_count: "9", promoted_product_num: "55",
    avatar: { url: "https://p16.tiktokcdn.com/a.jpeg", url_list: ["https://a", "https://b"] },
    profile_tt_uri: "x".repeat(200), top_collaborated_brand_ids: ["1", "2", "3"], product_original_price_range: { min: 1, max: 9 }, gpm: { amount: "3" }, username: "tina",
  };
  const trimmed = trimDetail(full) as Record<string, unknown>;
  assert.deepEqual(detailOf(trimmed, 4.4), detailOf(full, 4.4));
  for (const gone of ["profile_tt_uri", "top_collaborated_brand_ids", "product_original_price_range", "gpm", "username"]) assert.ok(!(gone in trimmed), gone);
  assert.deepEqual(trimmed.avatar, { url: "https://p16.tiktokcdn.com/a.jpeg" });
  assert.equal((trimmed.follower_location as unknown[]).length, 6);
  assert.equal(JSON.stringify(trimmed).length < JSON.stringify(full).length, true);
  assert.equal(trimDetail(null), null);
});

test("a creator TikTok lists twice for one product (two links) is saved once, with both links' numbers added up", () => {
  // Shape TikTok returned for campaign 7366140222567270161 on 14 Oct 2026.
  const row = (aff: string, paid: number, videos: number, lives: number, sample: string) => ({ campaign_id: "c", product_id: "p", username: "adillah", affiliate_product_id: aff, paid, videos, lives, sample_status: sample });
  const out = mergeCreatorRows([row("a1", 41065.8, 11, 176, "NotRequested"), row("a2", 95890.98, 28, 315, "NotRequested"), { ...row("a3", 5, 1, 0, "Pending"), username: "other" }]);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].affiliate_product_id, Math.round(Number(out[0].paid) * 100) / 100, out[0].videos, out[0].lives], ["a2", 136956.78, 39, 491]);
  const withSample = mergeCreatorRows([row("a1", 10, 1, 0, "Shipped"), row("a2", 20, 1, 0, "NotRequested")]);
  assert.equal(withSample[0].sample_status, "Shipped");
});
