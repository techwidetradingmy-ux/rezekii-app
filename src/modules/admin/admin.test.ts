import { test } from "node:test";
import assert from "node:assert/strict";
import { calStatus, calWeek } from "./posts.ts";

test("admin calendar: statuses, including paused and unconfirmed", () => {
  const now = Date.parse("2026-10-14T04:00:00Z");
  assert.equal(calStatus({ status: "posted", updated_at: "" }, false, now), "published");
  assert.equal(calStatus({ status: "scheduled", updated_at: "" }, true, now), "paused");
  assert.equal(calStatus({ status: "scheduled", updated_at: "" }, false, now), "scheduled");
  assert.equal(calStatus({ status: "processing", updated_at: "2026-10-14T03:50:00Z" }, false, now), "sending");
  assert.equal(calStatus({ status: "processing", updated_at: "2026-10-14T03:00:00Z" }, false, now), "unconfirmed");
  assert.equal(calStatus({ status: "draft", updated_at: "" }, false, now), null);
});

test("admin calendar: weeks run Monday to Sunday in Malaysia time", () => {
  // Wednesday 14 Oct 2026, 12:30 AM in Malaysia (still Tuesday in UTC)
  const w = calWeek(0, Date.parse("2026-10-13T16:30:00Z"));
  assert.equal(w.todayKey, "2026-10-14");
  assert.deepEqual([w.days[0].key, w.days[6].key], ["2026-10-12", "2026-10-18"]);
  assert.equal(w.startIso, "2026-10-11T16:00:00.000Z");
  assert.equal(w.label, "This week · 12 Oct – 18 Oct");
  assert.equal(calWeek(-1, Date.parse("2026-10-13T16:30:00Z")).days[0].key, "2026-10-05");
});
