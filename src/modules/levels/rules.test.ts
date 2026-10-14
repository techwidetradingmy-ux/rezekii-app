import { test } from "node:test";
import assert from "node:assert/strict";
import { monthSales, nextLevel, previousMonth, type LevelState } from "./rules.ts";

const fresh: LevelState = { level: "bronze", levelSince: null, goldInvited: false, demotedAt: null, checkedMonth: null };

test("levels: a new creator gets the level last month earned", () => {
  const t = (lastMonthSales: number | null, sampleVideos: number) => nextLevel(fresh, { today: "2026-10-14", sampleVideos, lastMonthSales }).level;
  assert.equal(t(144644, 12), "silver");
  assert.equal(t(999, 12), "bronze");
  assert.equal(t(5000, 9), "bronze");
  assert.equal(t(null, 12), "bronze"); // no TAP history to go by
  assert.equal(nextLevel(fresh, { today: "2026-10-14", sampleVideos: 12, lastMonthSales: 5000 }).checkedMonth, "2026-10");
});

test("levels: change only on the 1st, from last month's TAP sales", () => {
  const silver: LevelState = { level: "silver", levelSince: "2026-09-01", goldInvited: false, demotedAt: null, checkedMonth: "2026-09" };
  // Mid-month nothing changes, whatever the numbers.
  assert.equal(nextLevel({ ...silver, checkedMonth: "2026-10" }, { today: "2026-10-20", sampleVideos: 20, lastMonthSales: 10 }).level, "silver");
  const bronzeOct: LevelState = { level: "bronze", levelSince: null, goldInvited: false, demotedAt: null, checkedMonth: "2026-10" };
  assert.equal(nextLevel(bronzeOct, { today: "2026-10-20", sampleVideos: 20, lastMonthSales: 9000 }).level, "bronze");
  // 1 October: September had RM1,200, Silver stays; RM400, back to Bronze.
  assert.equal(nextLevel(silver, { today: "2026-10-01", sampleVideos: 20, lastMonthSales: 1200 }).level, "silver");
  const down = nextLevel(silver, { today: "2026-10-01", sampleVideos: 20, lastMonthSales: 400 });
  assert.deepEqual([down.level, down.demotedAt, down.levelSince], ["bronze", "2026-10-01", "2026-10-01"]);
  // October reaches RM1,000: Silver on 1 November.
  const up = nextLevel(down, { today: "2026-11-01", sampleVideos: 20, lastMonthSales: 1000 });
  assert.deepEqual([up.level, up.demotedAt, up.levelSince], ["silver", null, "2026-11-01"]);
  // Last month unknown: the level stays.
  assert.equal(nextLevel(silver, { today: "2026-10-01", sampleVideos: 20, lastMonthSales: null }).level, "silver");
});

test("levels: Gold is by invitation only", () => {
  assert.equal(nextLevel({ ...fresh, goldInvited: true }, { today: "2026-10-13", sampleVideos: 0, lastMonthSales: null }).level, "gold");
  const was: LevelState = { level: "gold", levelSince: "2026-08-01", goldInvited: false, demotedAt: null, checkedMonth: "2026-10" };
  assert.equal(nextLevel(was, { today: "2026-10-13", sampleVideos: 12, lastMonthSales: 2000 }).level, "silver");
  assert.equal(nextLevel(was, { today: "2026-10-13", sampleVideos: 2, lastMonthSales: 2000 }).level, "bronze");
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
