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

test("frameRange: custom dates from the calendar", () => {
  const c = frameRange("c:2026-10-08:2026-10-12", now, null)!;
  assert.deepEqual([c.from, c.to, c.unit, c.buckets, c.dates], [myt("2026-10-08T00:00:00"), myt("2026-10-13T00:00:00"), "day", 5, "8 Oct – 12 Oct"]);
  const back = frameRange("c:2026-10-12:2026-10-08", now, null)!;
  assert.equal(back.from, c.from);
  const one = frameRange("c:2026-10-01:2026-10-01", now, null)!;
  assert.deepEqual([one.buckets, one.dates], [1, "1 Oct"]);
  const long = frameRange("c:2025-11-03:2026-10-14", now, null)!;
  assert.equal(long.unit, "month");
  const prev = compareRange(c, "prev")!;
  assert.deepEqual([prev.from, prev.to], [myt("2026-10-03T00:00:00"), myt("2026-10-08T00:00:00")]);
  assert.equal(frameRange("c:2026-13-01:2026-10-01", now, null), null);
});

test("frameStats: the top videos and the top LIVEs listed apart, each with its first order's time", () => {
  const line = (o: Partial<OrderLine>): OrderLine => ({ order_id: "o", product_id: "p", product_name: "P", shop_name: "S", price: 10, quantity: 1, refunded_quantity: 0, returned_quantity: 0, commission_estimated: 1, commission_actual: null, campaign_id: null, content_type: null, content_id: null, status: "SETTLED", created_at: "2026-10-13T02:00:00Z", synced_at: "", ...o });
  const lives = Array.from({ length: 12 }, (_, i) => line({ order_id: `l${i}`, content_type: "LIVE", content_id: `room${i}`, price: 100 + i }));
  const lines = [...lives, line({ order_id: "v1", content_type: "VIDEO", content_id: "7001", created_at: "2026-10-12T05:00:00Z" }), line({ order_id: "v2", content_type: "VIDEO", content_id: "7001" }), line({ order_id: "s", content_type: "SHOP", content_id: "shop1" })];
  const s = frameStats(lines, frameRange("7d", now, null)!, new Set());
  const videos = s.content.filter((c) => c.type === "VIDEO"), live = s.content.filter((c) => c.type === "LIVE");
  assert.deepEqual(videos.map((c) => [c.id, c.orders, c.gmv, c.at]), [["7001", 2, 20, "2026-10-12T05:00:00Z"]], "a video still shows when LIVEs sold more");
  assert.equal(live.length, 10);
  assert.equal(live[0].id, "room11");
  assert.equal(s.content.some((c) => c.type === "SHOP"), false);
});
