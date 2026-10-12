import { test } from "node:test";
import assert from "node:assert/strict";
import { shortCount } from "./stats.ts";

test("TikTok stats: short counts", () => {
  assert.equal(shortCount(undefined), "—");
  assert.equal(shortCount(47), "47");
  assert.equal(shortCount(1000), "1K");
  assert.equal(shortCount(24300), "24.3K");
  assert.equal(shortCount(312000), "312K");
  assert.equal(shortCount(1250000), "1.3M");
});
