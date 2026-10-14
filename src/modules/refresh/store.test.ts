import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCreatorRows } from "./store.ts";

test("a creator TikTok lists twice for one product (two links) is saved once, with both links' numbers added up", () => {
  // Shape TikTok returned for campaign 7366140222567270161 on 14 Oct 2026.
  const row = (aff: string, paid: number, videos: number, lives: number, sample: string) => ({ campaign_id: "c", product_id: "p", username: "adillah", affiliate_product_id: aff, paid, videos, lives, sample_status: sample });
  const out = mergeCreatorRows([row("a1", 41065.8, 11, 176, "NotRequested"), row("a2", 95890.98, 28, 315, "NotRequested"), { ...row("a3", 5, 1, 0, "Pending"), username: "other" }]);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].affiliate_product_id, Math.round(Number(out[0].paid) * 100) / 100, out[0].videos, out[0].lives], ["a2", 136956.78, 39, 491]);
  const withSample = mergeCreatorRows([row("a1", 10, 1, 0, "Shipped"), row("a2", 20, 1, 0, "NotRequested")]);
  assert.equal(withSample[0].sample_status, "Shipped");
});
