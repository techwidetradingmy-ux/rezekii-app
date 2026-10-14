import { test } from "node:test";
import assert from "node:assert/strict";
import { TAG_START, tagFilters, tagNext, type TagState } from "./tags.ts";

/** Runs the steps against a creator TikTok lists as `agency` at `level` (null: not in the marketplace). */
function run(agency: "managed" | "independent" | null, level: number | null) {
  let s: TagState = TAG_START;
  for (let i = 0; i < 10; i++) {
    const f = tagFilters(s);
    const found =
      agency !== null &&
      (f.affiliate_data ? (f.affiliate_data.creator_agency_staus === "AGENCY_MANAGED") === (agency === "managed") : f.advanced_filters!.creator_level.includes(`Lv. ${level}`));
    const r = tagNext(s, found);
    if (r.done) return { ...r.done, searches: i + 1 };
    s = r.state;
  }
  throw new Error("never finished");
}

test("tags: agency first, then the level by halving Lv. 0-8", () => {
  for (let lv = 0; lv <= 8; lv++) {
    const r = run("managed", lv);
    assert.deepEqual([r.agency, r.level], ["managed", lv]);
    assert.ok(r.searches <= 6, `Lv. ${lv} took ${r.searches} searches`);
  }
  assert.deepEqual(run("independent", 6), { agency: "independent", level: 6, searches: 5 });
  assert.deepEqual(run(null, null), { agency: null, level: null, searches: 2 });
  assert.deepEqual(tagFilters({ step: "level", agency: "managed", lo: 0, hi: 8 }), { advanced_filters: { creator_level: ["Lv. 0", "Lv. 1", "Lv. 2", "Lv. 3", "Lv. 4"] } });
});
