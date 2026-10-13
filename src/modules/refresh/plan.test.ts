import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTHOR_TYPES, CATEGORIES, FOLLOWER_BANDS, bestSlot, mytDay, mytHour, planDay } from "./plan.ts";

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
