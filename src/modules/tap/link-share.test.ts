import { test } from "node:test";
import assert from "node:assert/strict";
import { attributeLinkSales } from "./link-share.ts";
import { joinTags } from "./convert.ts";

const line = (o: Partial<Parameters<typeof attributeLinkSales>[1][number]>) => ({
  order_id: "o1", product_id: "p1", link_tag: "facebook", price: 10, quantity: 1, refunded_quantity: 0, returned_quantity: 0, status: "COMPLETED",
  commission_estimated: 1, commission_actual: null, commission_earned_estimated: null, commission_earned_actual: null, created_at: "2026-10-16T00:00:00Z", ...o,
});

test("link-share sales go to the link with the same product and tag, the newest made before the order", () => {
  const links = [
    { product_id: "p1", tag: "facebook", link: "L1", made_at: "2026-10-10T00:00:00Z" },
    { product_id: "p1", tag: "facebook", link: "L2", made_at: "2026-10-15T00:00:00Z" },
    { product_id: "p1", tag: null, link: "L3", made_at: "2026-10-01T00:00:00Z" },
  ];
  const { byLink: perf, outside, counts } = attributeLinkSales(links, [
    line({ order_id: "a", created_at: "2026-10-12T00:00:00Z" }),
    line({ order_id: "b", created_at: "2026-10-16T00:00:00Z", quantity: 2 }),
    line({ order_id: "c", link_tag: null, price: 5 }),
    line({ order_id: "d", status: "REFUNDED" }),
    line({ order_id: "e", created_at: "2026-09-01T00:00:00Z" }),
    line({ order_id: "f", link_tag: "threads" }),
  ]);
  assert.deepEqual(perf.L1, { orders: 1, items: 1, gmv: 10, commission: 1, last: "2026-10-12T00:00:00Z" });
  assert.equal(perf.L2.orders, 1);
  assert.equal(perf.L2.gmv, 20);
  assert.equal(perf.L3.gmv, 5);
  assert.equal(Object.keys(perf).length, 3);
  // Orders no Rezekii link can claim (made before the link, or another tag) are added up by product and tag.
  assert.deepEqual(outside.map((o) => [o.product_id, o.tag, o.orders]).sort(), [["p1", "facebook", 1], ["p1", "threads", 1]]);
  assert.deepEqual(counts, { all: 5, mine: 3, outside: 2, byTag: { facebook: 3, "no tag": 1, threads: 1 } });
});

test("an order with two products counts once in the totals", () => {
  const { outside, counts } = attributeLinkSales([], [line({ order_id: "a", link_tag: null }), line({ order_id: "a", link_tag: null, product_id: "p2" })]);
  assert.equal(outside.reduce((s, o) => s + o.orders, 0), 2);
  assert.deepEqual(counts, { all: 1, mine: 0, outside: 1, byTag: { "no tag": 1 } });
});

test("link-share sales with no Rezekii links all count as made outside Rezekii", () => {
  const { byLink, outside } = attributeLinkSales([], [line({ order_id: "a", link_tag: null }), line({ order_id: "b", link_tag: null, product_id: "p2", price: 7 }), line({ order_id: "c", link_tag: null, quantity: 3 })]);
  assert.deepEqual(byLink, {});
  assert.deepEqual(outside.map((o) => [o.product_id, o.tag, o.orders, o.gmv]).sort(), [["p1", null, 2, 40], ["p2", null, 1, 7]]);
});

test("several tags make one link tag, at most 100 characters", () => {
  assert.equal(joinTags(["facebook", "threads", "whatsapp"]), "facebook-threads-whatsapp");
  assert.ok(joinTags(Array.from({ length: 10 }, () => "abcdefghijklmnopqrst")).length <= 100);
  assert.ok(!joinTags(Array.from({ length: 10 }, () => "abcdefghijklmnopqrst")).endsWith("-"));
});
