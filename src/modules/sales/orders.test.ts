import { test } from "node:test";
import assert from "node:assert/strict";
import { money, orderRows } from "./orders.ts";

test("money reads TikTok's RM text", () => {
  assert.equal(money({ amount: "RM12.00" }), 12);
  assert.equal(money({ amount: "RM1,234.50" }), 1234.5);
  assert.equal(money("0.84"), 0.84);
  assert.equal(money({}), null);
  assert.equal(money(undefined), null);
});

test("orderRows makes one row per line, with the sale's video and campaign", () => {
  const rows = orderRows("u1", [
    {
      id: "o1",
      status: "SETTLED",
      create_time: 1791000000,
      skus: [
        { id: "l1", product_id: "p1", product_name: "Kacip", shop_name: "OLZZ", price: { amount: "RM39.90", currency: "MYR" }, quantity: 2, estimated_commission: { amount: "RM3.99", currency: "MYR" }, content_type: "VIDEO", content_id: "v9", campaign_id: "c7", tag: "threads" },
        { id: "l2", product_id: "p2", price: { amount: "RM12.00", currency: "MYR" }, quantity: 1 },
      ],
    },
    { id: "o2", status: "REFUNDED", create_time: 1791000500000, skus: { id: "l3", product_id: "p3", price: { amount: "RM5.00", currency: "MYR" }, quantity: 1, refunded_quantity: 1 } },
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(
    { id: rows[0].line_id, price: rows[0].price, qty: rows[0].quantity, com: rows[0].commission_estimated, video: rows[0].content_id, camp: rows[0].campaign_id, tag: rows[0].link_tag, at: rows[0].created_at },
    { id: "l1", price: 39.9, qty: 2, com: 3.99, video: "v9", camp: "c7", tag: "threads", at: new Date(1791000000 * 1000).toISOString() },
  );
  assert.equal(rows[1].campaign_id, null);
  assert.equal(rows[2].created_at, new Date(1791000500000).toISOString());
  assert.equal(rows[2].refunded_quantity, 1);
});
