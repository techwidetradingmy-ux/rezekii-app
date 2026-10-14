import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoard, gmvRange, inBoth } from "./daily.ts";

const day = (as_of: string, users: string[]) => ({ as_of, items: users.map((u, i) => ({ rank: i + 1, user_name: u, nick_name: u.toUpperCase(), followers_count: 10, gmv_range: "MYR100.5~MYR200" })) });
const days = [day("2026-10-13", ["aria", "vault", "lane"]), day("2026-10-12", ["lane", "glow", "vault"]), day("2026-10-11", ["lane", "vault"])];

test("buildBoard: the day's list with change, days in the top 100 and rank history", () => {
  const b = buildBoard(days, "2026-10-13", new Set(["vault"]), { lane: "pic" })!;
  assert.equal(b.rows.length, 3);
  assert.deepEqual(b.rows.map((r) => [r.user, r.rank, r.prev, r.days, r.rezekii]), [["aria", 1, null, 1, false], ["vault", 2, 3, 3, true], ["lane", 3, 1, 3, false]]);
  assert.deepEqual(b.historyDays, ["2026-10-11", "2026-10-12", "2026-10-13"]);
  assert.deepEqual(b.rows[2].history, [1, 1, 3]);
  assert.equal(b.rows[2].avatar, "pic");
  assert.deepEqual([b.rows[0].lo, b.rows[0].hi], [100.5, 200]);
  assert.deepEqual(b.hall.slice(0, 2).map((h) => [h.user, h.days, h.best]), [["lane", 3, 1], ["vault", 3, 2]]);
  assert.equal(b.saved, 3);
});

test("buildBoard: an older day has the day before it as the comparison", () => {
  const b = buildBoard(days, "2026-10-12", new Set(), {})!;
  assert.deepEqual(b.rows.map((r) => [r.user, r.prev]), [["lane", 1], ["glow", null], ["vault", 2]]);
  assert.equal(buildBoard(days, "2026-10-01", new Set(), {}), null);
  assert.deepEqual(gmvRange(undefined), [0, 0]);
});

test("inBoth: TikTok's RM list as given, minus creators missing from its US$ list", () => {
  const L = [{ rank: 1, user_name: "aria", gmv_range: "MYR43605399~MYR73273364" }, { rank: 2, user_name: "fly", gmv_range: "MYR1032191~MYR1617435" }];
  const U = [{ rank: 1, user_name: "fly", gmv_range: "$252678~$395945" }];
  assert.deepEqual(inBoth(L, U), [{ ...L[1], rank: 1 }]);
  assert.deepEqual(inBoth(L, []), L);
});
