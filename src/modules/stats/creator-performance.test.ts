import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeCreatorPerformance, type PerformanceRow } from "./creator-performance.ts";

const row = (username: string, campaignId: string, productId: string, amount: string, extra: Partial<PerformanceRow> = {}): PerformanceRow => ({
  campaignId,
  productId,
  affiliate_product_id: "a-" + productId,
  creator: { creator_temp_id: "t-" + username, user_name: username },
  paid_amount: { amount, currency: "MYR" },
  video_count: 0,
  room_count: 0,
  free_sample_status: "NotRequested",
  ...extra,
});

const rows = [
  row("tinawellnesshacks", "c1", "p1", "300.40", { video_count: 4, room_count: 2 }),
  row("tinawellnesshacks", "c1", "p2", "100.00", { video_count: 1, free_sample_status: "AWAITING_SHIPMENT" }),
  row("tinawellnesshacks", "c2", "p9", "11.00"),
  row("someone", "c1", "p1", "500.00", { room_count: 9, free_sample_status: "NOT_REQUESTED" }),
];
const registered = (u: string) => u === "tinawellnesshacks";

test("one row per creator, highest GMV first", () => {
  const s = summarizeCreatorPerformance(rows, registered);
  assert.deepEqual(s.map((c) => c.username), ["someone", "tinawellnesshacks"]);
});

test("totals add up across products and campaigns", () => {
  const tina = summarizeCreatorPerformance(rows, registered).find((c) => c.username === "tinawellnesshacks");
  assert.ok(tina);
  assert.equal(Math.round(tina.gmv * 100) / 100, 411.4);
  assert.equal(tina.currency, "MYR");
  assert.equal(tina.videos, 5);
  assert.equal(tina.lives, 2);
  assert.equal(tina.products, 3);
  assert.equal(tina.campaigns, 2);
  assert.equal(tina.registered, true);
});

test("samples count any requested status; both spellings of not-requested are ignored", () => {
  const s = summarizeCreatorPerformance(rows, registered);
  assert.equal(s.find((c) => c.username === "tinawellnesshacks")?.samples, 1);
  assert.equal(s.find((c) => c.username === "someone")?.samples, 0);
  assert.equal(s.find((c) => c.username === "someone")?.registered, false);
});

test("empty input", () => {
  assert.deepEqual(summarizeCreatorPerformance([], registered), []);
});
