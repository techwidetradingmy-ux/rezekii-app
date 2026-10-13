import { test } from "node:test";
import assert from "node:assert/strict";
import { monthSales, nextLevel, previousMonth, type LevelState } from "./rules.ts";

const fresh: LevelState = { level: "bronze", levelSince: null, goldInvited: false, demotedAt: null, checkedMonth: null };

test("levels: Silver comes as soon as a creator first qualifies", () => {
  const notYet = nextLevel(fresh, { today: "2026-10-13", lifetime: 999, sampleVideos: 10, lastMonthSales: null });
  assert.equal(notYet.level, "bronze");
  assert.equal(nextLevel(fresh, { today: "2026-10-13", lifetime: 1000, sampleVideos: 9, lastMonthSales: null }).level, "bronze");
  const s = nextLevel(fresh, { today: "2026-10-13", lifetime: 1000, sampleVideos: 10, lastMonthSales: null });
  assert.deepEqual(s, { level: "silver", levelSince: "2026-10-13", goldInvited: false, demotedAt: null, checkedMonth: "2026-10" });
});

test("levels: Silver is kept with RM1,000 a month and lost at month end without it", () => {
  const silver: LevelState = { level: "silver", levelSince: "2026-09-02", goldInvited: false, demotedAt: null, checkedMonth: "2026-09" };
  // Mid-month nothing changes, even with a slow month so far.
  assert.equal(nextLevel({ ...silver, checkedMonth: "2026-10" }, { today: "2026-10-20", lifetime: 5000, sampleVideos: 20, lastMonthSales: 10 }).level, "silver");
  // First run in October: September had RM1,200, so Silver stays.
  assert.equal(nextLevel(silver, { today: "2026-10-01", lifetime: 5000, sampleVideos: 20, lastMonthSales: 1200 }).level, "silver");
  // September had RM400: back to Bronze on 1 October.
  const down = nextLevel(silver, { today: "2026-10-01", lifetime: 5000, sampleVideos: 20, lastMonthSales: 400 });
  assert.deepEqual([down.level, down.demotedAt, down.levelSince], ["bronze", "2026-10-01", "2026-10-01"]);
  // Still qualified on lifetime numbers, but no bounce back the next day.
  assert.equal(nextLevel(down, { today: "2026-10-02", lifetime: 6000, sampleVideos: 20, lastMonthSales: 400 }).level, "bronze");
  // October reaches RM1,000: Silver again on 1 November.
  const up = nextLevel({ ...down, checkedMonth: "2026-10" }, { today: "2026-11-01", lifetime: 7000, sampleVideos: 20, lastMonthSales: 1000 });
  assert.deepEqual([up.level, up.demotedAt], ["silver", null]);
  // Without a month of history nobody is demoted.
  assert.equal(nextLevel(silver, { today: "2026-10-01", lifetime: 5000, sampleVideos: 20, lastMonthSales: null }).level, "silver");
});

test("levels: Gold is by invitation only", () => {
  assert.equal(nextLevel({ ...fresh, goldInvited: true }, { today: "2026-10-13", lifetime: 0, sampleVideos: 0, lastMonthSales: null }).level, "gold");
  const was: LevelState = { level: "gold", levelSince: "2026-08-01", goldInvited: false, demotedAt: null, checkedMonth: "2026-10" };
  assert.equal(nextLevel(was, { today: "2026-10-13", lifetime: 3000, sampleVideos: 12, lastMonthSales: 2000 }).level, "silver");
  assert.equal(nextLevel(was, { today: "2026-10-13", lifetime: 300, sampleVideos: 2, lastMonthSales: 2000 }).level, "bronze");
});

test("levels: a month's sales from daily lifetime totals", () => {
  const days = [
    { day: "2026-08-31", paid: 100 }, { day: "2026-09-01", paid: 120 }, { day: "2026-09-30", paid: 1500 }, { day: "2026-10-05", paid: 1700 },
  ];
  assert.equal(monthSales(days, "2026-09"), 1400); // 1500 - 100 (the total before September)
  assert.equal(monthSales(days, "2026-10"), 200);
  assert.equal(monthSales(days, "2026-07"), null);
  assert.equal(monthSales([{ day: "2026-10-03", paid: 50 }, { day: "2026-10-09", paid: 80 }], "2026-10"), 30); // tracking began mid-month
  assert.equal(previousMonth("2026-10-13"), "2026-09");
  assert.equal(previousMonth("2027-01-01"), "2026-12");
});
