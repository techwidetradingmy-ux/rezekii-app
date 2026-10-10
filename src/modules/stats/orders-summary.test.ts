import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeOrders } from "./orders-summary.ts";

const m = (amount: string) => ({ amount, currency: "MYR" });
const r2 = (v: number) => Math.round(v * 100) / 100;
const t = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const orders = [
  { id: "o1", status: "SETTLED", create_time: t("2026-08-10T04:00:00Z"), skus: [
    { product_id: "p1", product_name: "Kacip", price: m("39.90"), quantity: 2, actual_commission: m("8.00"), estimated_commission: m("7.98"), content_id: "v1", content_type: "VIDEO", tag: "threads" },
    { product_id: "p2", product_name: "Krill", price: m("129.00"), quantity: 1, estimated_commission: m("10.32"), content_id: "v1", content_type: "VIDEO", tag: "threads", refunded_quantity: 1 }
  ] },
  { id: "o2", status: "TO-SETTLE", create_time: t("2026-10-01T04:00:00Z"), skus: [
    { product_id: "p1", product_name: "Kacip", price: m("39.90"), quantity: 1, estimated_commission: m("3.99"), content_id: "L9", content_type: "LIVE" }
  ] },
  { id: "o3", status: "SETTLED", create_time: t("2026-10-05T04:00:00Z"), skus: { product_id: "p3", product_name: "Tomato", price: m("99.00"), quantity: 1, actual_commission: m("21.78"), creator_username: "aisyah.reviews" } }
];

test("totals: GMV, units, refunds, commission prefers actual", () => {
  const s = summarizeOrders(orders);
  assert.equal(s.orders, 3);
  assert.equal(s.units, 5);
  assert.equal(s.refundedUnits, 1);
  assert.equal(r2(s.gmv), r2(79.8 + 129 + 39.9 + 99));
  assert.equal(r2(s.commission), r2(8 + 10.32 + 3.99 + 21.78));
  assert.equal(s.currency, "MYR");
  assert.deepEqual(s.byStatus, { SETTLED: 2, "TO-SETTLE": 1 });
});

test("earliest and latest order dates", () => {
  const s = summarizeOrders(orders);
  assert.equal(s.earliest, t("2026-08-10T04:00:00Z"));
  assert.equal(s.latest, t("2026-10-05T04:00:00Z"));
});

test("groups: month, product, content, tag, creator; orders counted once per group", () => {
  const s = summarizeOrders(orders);
  assert.deepEqual(s.byMonth.map((r) => [r.key, r.orders]), [["2026-08", 1], ["2026-10", 2]]);
  assert.equal(s.byProduct[0].label, "Krill");
  const kacip = s.byProduct.find((r) => r.key === "p1");
  assert.ok(kacip);
  assert.equal(kacip.orders, 2);
  assert.equal(kacip.units, 3);
  const v1 = s.byContent.find((r) => r.key === "v1");
  assert.ok(v1);
  assert.equal(v1.orders, 1);
  assert.equal(v1.label, "VIDEO v1");
  assert.deepEqual(s.byTag.map((r) => r.key).sort(), ["(no tag)", "threads"]);
  assert.deepEqual(s.byCreator.map((r) => r.label), ["@aisyah.reviews"]);
});

test("TAP orders where skus is a single object are handled", () => {
  const s = summarizeOrders([orders[2]]);
  assert.equal(s.units, 1);
  assert.equal(s.gmv, 99);
});

test("empty input", () => {
  const s = summarizeOrders([]);
  assert.equal(s.orders, 0);
  assert.equal(s.gmv, 0);
  assert.equal(s.earliest, undefined);
});
