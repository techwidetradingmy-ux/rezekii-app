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
  const perf = attributeLinkSales(links, [
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
});

test("several tags make one link tag, at most 100 characters", () => {
  assert.equal(joinTags(["facebook", "threads", "whatsapp"]), "facebook-threads-whatsapp");
  assert.ok(joinTags(Array.from({ length: 10 }, () => "abcdefghijklmnopqrst")).length <= 100);
  assert.ok(!joinTags(Array.from({ length: 10 }, () => "abcdefghijklmnopqrst")).endsWith("-"));
});
