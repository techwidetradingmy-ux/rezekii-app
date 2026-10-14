import { test } from "node:test";
import assert from "node:assert/strict";
import { listRankings } from "./query.ts";
import type { Built } from "./store.ts";

test("listRankings: a list TikTok published late shows its own day", () => {
  const none = { "1D": [], "7D": [], "30D": [] };
  const b = { asOf: "2026-10-13", listDays: { videos: "2026-10-12" }, tier1: { "1D": 0, "7D": 0, "30D": 0 }, rates: { creators: {} }, dropped: {}, videos: none, lives: none } as unknown as Built;
  assert.equal(listRankings(b, { view: 2, slot: 0 }).asOf, "2026-10-12");
  assert.equal(listRankings(b, { view: 3, slot: 0 }).asOf, "2026-10-13");
});
