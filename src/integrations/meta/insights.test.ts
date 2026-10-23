import { test } from "node:test";
import assert from "node:assert/strict";
import { facebookPostStat, metricValues } from "./insights.ts";

test("Meta's insights answers become plain numbers: totals, added-up values, numbers sent as text; breakdowns skipped", () => {
  const m = metricValues([
    { name: "views", total_value: { value: 1200 } },
    { name: "page_media_view", values: [{ value: 40 }, { value: 60 }] },
    { name: "reach", values: [{ value: "15" }] },
    { name: "page_fans_country", values: [{ value: { MY: 10 } }] },
    { name: "empty", values: [] },
  ]);
  assert.deepEqual(m, { views: 1200, page_media_view: 100, reach: 15 });
  assert.deepEqual(metricValues(undefined), {});
});

test("a Facebook post's numbers come from its counts and its insights, whichever Meta gave", () => {
  const full = facebookPostStat({
    id: "1_2", created_time: "2026-10-22T10:00:00+0000", message: "Hello", permalink_url: "https://www.facebook.com/1/posts/2", full_picture: "https://x/p.jpg", shares: { count: 3 },
    comments: { summary: { total_count: 4 } }, reactions: { summary: { total_count: 25 } },
    insights: { data: [{ name: "post_media_view", values: [{ value: 900 }] }, { name: "post_total_media_view_unique", values: [{ value: 700 }] }] },
  });
  assert.deepEqual(full.numbers, { views: 900, reach: 700, likes: 25, comments: 4, shares: 3 });
  assert.equal(full.caption, "Hello");
  // Without the insights (an older sign-in): only the counts, and nothing made up.
  assert.deepEqual(facebookPostStat({ id: "1_3", reactions: { summary: { total_count: 2 } } }).numbers, { likes: 2 });
});
