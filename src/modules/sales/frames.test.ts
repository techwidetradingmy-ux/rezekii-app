import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRange, frameRange, frameStats, statusOf } from "./frames.ts";
import type { OrderLine } from "./summary.ts";

// 14 Oct 2026, 17:00 in Malaysia.
const now = Date.parse("2026-10-14T09:00:00Z");
const myt = (s: string) => Date.parse(`${s}+08:00`);

test("frameRange: Malaysian days, months and the chart unit for each time frame", () => {
  const y = frameRange("yesterday", now, null)!;
  assert.deepEqual([y.from, y.to, y.unit, y.buckets, y.dates], [myt("2026-10-13T00:00:00"), myt("2026-10-14T00:00:00"), "hour", 24, "13 Oct"]);
  const d7 = frameRange("7d", now, null)!;
  assert.deepEqual([d7.from, d7.to, d7.buckets, d7.dates], [myt("2026-10-08T00:00:00"), myt("2026-10-15T00:00:00"), 7, "8 Oct – 14 Oct"]);
  const m = frameRange("month", now, null)!;
  assert.deepEqual([m.from, m.buckets], [myt("2026-10-01T00:00:00"), 14]);
  const lm = frameRange("lastmonth", now, null)!;
  assert.deepEqual([lm.from, lm.to, lm.buckets, lm.dates], [myt("2026-09-01T00:00:00"), myt("2026-10-01T00:00:00"), 30, "September"]);
  const yr = frameRange("1y", now, null)!;
  assert.deepEqual([yr.from, yr.unit, yr.buckets, yr.dates], [myt("2025-11-01T00:00:00"), "month", 12, "Nov 2025 – Oct 2026"]);
  const all = frameRange("all", now, Date.parse("2025-09-18T03:00:00Z"))!;
  assert.deepEqual([all.from, all.buckets, all.dates], [myt("2025-09-01T00:00:00"), 14, "Since 18 Sep 2025"]);
  const sep = frameRange("m:2026-09", now, null)!;
  assert.deepEqual([sep.label, sep.buckets], ["September 2026", 30]);
  assert.equal(frameRange("m:2026-12", now, null), null);
  assert.equal(frameRange("nonsense", now, null), null);
});

test("compareRange: the period before and the same time last year", () => {
  const d7 = frameRange("7d", now, null)!;
  const prev = compareRange(d7, "prev")!;
  assert.deepEqual([prev.from, prev.to, prev.dates], [myt("2026-10-01T00:00:00"), myt("2026-10-08T00:00:00"), "1 Oct – 7 Oct"]);
  const ly = compareRange(d7, "year")!;
  assert.deepEqual([ly.from, ly.to], [myt("2025-10-08T00:00:00"), myt("2025-10-15T00:00:00")]);
  const lm = compareRange(frameRange("lastmonth", now, null)!, "prev")!;
  assert.deepEqual([lm.from, lm.to, lm.buckets, lm.dates], [myt("2026-08-01T00:00:00"), myt("2026-09-01T00:00:00"), 31, "August"]);
  assert.equal(compareRange(frameRange("all", now, null)!, "prev"), null);
  assert.equal(compareRange(d7, "none"), null);
});

test("statusOf groups TikTok's order statuses", () => {
  assert.deepEqual(["SETTLED", "To-SETTLE", "AWAITING PAYMENT", "REFUNDED", "INELIGIBLE", null].map(statusOf), ["settled", "toSettle", "awaiting", "refunded", "ineligible", "awaiting"]);
});

test("frameStats: buckets, statuses and lost commission", () => {
  const line = (o: Partial<OrderLine>): OrderLine => ({ order_id: "o", product_id: "p", product_name: "P", shop_name: "S", price: 10, quantity: 1, refunded_quantity: 0, returned_quantity: 0, commission_estimated: 1, commission_actual: null, campaign_id: null, content_type: null, content_id: null, status: "SETTLED", created_at: "2026-10-13T02:00:00Z", synced_at: "", ...o });
  const lines = [line({ order_id: "a" }), line({ order_id: "b", status: "To-SETTLE", created_at: "2026-10-14T02:00:00Z" }), line({ order_id: "c", status: "REFUNDED", commission_estimated: 0, commission_earned_estimated: 1 })];
  const s = frameStats(lines, frameRange("7d", now, null)!, new Set());
  assert.equal(s.gmv, 20);
  assert.equal(s.orders, 3);
  assert.deepEqual(s.buckets.slice(-2), [10, 10]);
  const by = Object.fromEntries(s.status.map((x) => [x.key, x]));
  assert.deepEqual([by.settled.orders, by.settled.commission, by.toSettle.orders, by.refunded.orders, by.refunded.commission, by.refunded.gmv], [1, 1, 1, 1, 1, 10]);
});
