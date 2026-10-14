import { test } from "node:test";
import assert from "node:assert/strict";
import { lineGmv, summarize, type OrderLine } from "./summary.ts";

const now = Date.parse("2026-10-14T06:00:00Z");
const line = (o: Partial<OrderLine>): OrderLine => ({
  order_id: "o", product_id: "p1", product_name: "Kacip", shop_name: "OLZZ", price: 10, quantity: 1, refunded_quantity: 0, returned_quantity: 0,
  commission_estimated: 1, commission_actual: null, campaign_id: null, content_type: "VIDEO", content_id: "v1", status: "SETTLED",
  created_at: "2026-10-13T03:00:00Z", synced_at: "2026-10-14T05:00:00Z", ...o,
});

test("lineGmv: unit price times the units kept; refunds count as nothing", () => {
  assert.equal(lineGmv(line({ price: 55.44, quantity: 3 })), 166.32);
  assert.equal(lineGmv(line({ price: 10, quantity: 3, refunded_quantity: 1 })), 20);
  assert.equal(lineGmv(line({ status: "REFUNDED" })), 0);
});

test("summarize: totals, the day buckets, the period before and the Techwide TAP split", () => {
  const lines = [
    line({ order_id: "a", price: 20, quantity: 2, commission_estimated: 4, campaign_id: "tw1" }),
    line({ order_id: "b", product_id: "p2", product_name: "Collagen", price: 30, status: "To-SETTLE", commission_estimated: 3, content_id: "v2" }),
    line({ order_id: "c", price: 15, status: "REFUNDED" }),
    line({ order_id: "d", price: 50, created_at: "2026-09-20T03:00:00Z" }),
  ];
  const s = summarize(lines, 7, now, new Set(["tw1"]));
  assert.equal(s.gmv, 70);
  assert.equal(s.prevGmv, 0);
  assert.equal(s.orders, 3);
  assert.equal(s.items, 3);
  assert.equal(s.commission, 7);
  assert.equal(s.toSettle, 3);
  assert.equal(s.refunded, 15);
  assert.equal(s.techwideGmv, 40);
  assert.equal(s.otherGmv, 30);
  assert.equal(s.daily.length, 7);
  assert.equal(s.daily[5], 70);
  assert.deepEqual(s.products.map((p) => [p.name, p.gmv]), [["Kacip", 40], ["Collagen", 30]]);
  assert.equal(summarize(lines, 7, now, new Set(["tw1"]), "techwide").gmv, 40);
  assert.equal(summarize(lines, 30, now, new Set(["tw1"])).gmv, 120);
});
