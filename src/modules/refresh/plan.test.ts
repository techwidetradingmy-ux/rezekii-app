import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTHOR_TYPES, CATEGORIES, FOLLOWER_BANDS, TT_LEVELS, bestSlot, mytDay, mytHour, planDay, planNewest } from "./plan.ts";

// 2026-10-13 06:30 in Malaysia = 2026-10-12 22:30 UTC.
const now = Date.parse("2026-10-12T22:30:00Z");

test("refresh plan: Malaysian day and hour", () => {
  assert.equal(mytDay(now), "2026-10-13");
  assert.equal(mytDay(now, 2), "2026-10-11");
  assert.equal(mytHour(now), 6);
  assert.equal(mytHour(Date.parse("2026-10-12T21:59:00Z")), 5);
});

test("refresh plan: list slots", () => {
  assert.equal(bestSlot({ kind: "creators", timeSlot: "30D", currency: "LOCAL", authorType: "AFFILIATE" }), "30D|AFFILIATE|LOCAL");
  assert.equal(bestSlot({ kind: "products", timeSlot: "1D", currency: "USD", categoryId: "" }), "1D|ALL|USD");
  assert.equal(bestSlot({ kind: "products", timeSlot: "7D", currency: "LOCAL", categoryId: "600001" }), "7D|600001|LOCAL");
  assert.equal(bestSlot({ kind: "videos", timeSlot: "7D", currency: "LOCAL" }), "7D|LOCAL");
});

test("refresh plan: first run fills 30 days, later runs only the missing ones", () => {
  const lists = (AUTHOR_TYPES.length + CATEGORIES.length) * 2;
  const first = planDay(now, new Set());
  const newest = first.filter((t) => t.kind === "best" && (t.params as { date: string }).date === "2026-10-11");
  assert.equal(newest.length, 3 * 2 * (AUTHOR_TYPES.length + CATEGORIES.length + 2));
  const older = first.filter((t) => t.kind === "best" && t.priority === 4);
  assert.equal(older.length, 29 * lists);
  assert.equal(new Set(first.map((t) => t.key)).size, first.length, "keys are unique");
  assert.equal(first.filter((t) => t.kind === "marketplace").length, FOLLOWER_BANDS.length);
  assert.equal(first[0].kind, "tap_campaigns");
  assert.equal(first.filter((t) => t.kind === "levels").length, 1);
  assert.deepEqual(first.find((t) => t.kind === "rankings")?.params, { day: "2026-10-11" });

  const have = new Set(Array.from({ length: 29 }, (_, i) => mytDay(now, i + 3)));
  have.delete("2026-10-05");
  const later = planDay(now, have).filter((t) => t.priority === 4);
  assert.equal(later.length, lists);
  assert.ok(later.every((t) => (t.params as { date: string }).date === "2026-10-05"));
});

test("a capped marketplace search splits by GMV range, then by units sold, then stops", async () => {
  const { marketSplits } = await import("./steps.ts");
  const g = marketSplits({ min: 0, max: 999 });
  assert.equal(g.length, 4);
  assert.equal(g[0].key, "marketplace|0-999|GMV_RANGE_0_100");
  const u = marketSplits(g[0].params as { min: number; max: number | null; gmv: string });
  assert.equal(u.length, 4);
  assert.equal(u[3].key, "marketplace|0-999|GMV_RANGE_0_100|UNITS_SOLD_RANGE_1000_AND_ABOVE");
  assert.deepEqual(marketSplits(u[0].params as { min: number; max: number | null; gmv: string; units: string }), []);
});

test("planNewest plans one data date in full: every list, then its own Rankings build", () => {
  const t = planNewest("2026-10-13");
  assert.ok(t.some((x) => x.key === "rankings|2026-10-13" && (x.params as { day: string }).day === "2026-10-13"));
  assert.ok(t.some((x) => x.kind === "best" && (x.params as { kind: string; date: string; timeSlot: string }).kind === "creators" && (x.params as { date: string }).date === "2026-10-13" && (x.params as { timeSlot: string }).timeSlot === "1D"));
  assert.equal(new Set(t.map((x) => x.key)).size, t.length);
});

test("planDay skips the day-2 lists when yesterday's late check already built them", () => {
  const all = planDay(now, new Set());
  const skip = planDay(now, new Set(), true);
  assert.ok(all.some((t) => t.kind === "rankings"));
  assert.ok(!skip.some((t) => t.kind === "rankings"));
  assert.ok(skip.some((t) => t.key === "tap_campaigns") && skip.some((t) => t.kind === "orders"));
});

test("refresh plan: on the 1st the marketplace search is split by creator level; the usual one waits while it runs", async () => {
  const first = Date.parse("2026-10-31T16:30:00Z"); // 1 November, 00:30 in Malaysia
  const day1 = planDay(first, new Set()).filter((t) => t.kind === "marketplace");
  assert.equal(day1.length, TT_LEVELS.length * FOLLOWER_BANDS.length);
  assert.deepEqual(day1[0], { key: "marketplace|lv0|0-999", kind: "marketplace", params: { min: 0, max: 999, level: "Lv. 0" }, priority: 6 });
  assert.equal(planDay(now, new Set(), false, true).filter((t) => t.kind === "marketplace").length, 0);
  assert.equal(planDay(now, new Set()).filter((t) => t.kind === "agency").length, 1);
  const { marketSplits } = await import("./steps.ts");
  assert.equal(marketSplits({ min: 0, max: 999, level: "Lv. 3" })[0].key, "marketplace|lv3|0-999|GMV_RANGE_0_100");
});
