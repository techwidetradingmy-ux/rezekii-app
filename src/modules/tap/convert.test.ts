import { test } from "node:test";
import assert from "node:assert/strict";
import { fromTikTok } from "./convert.ts";

// Shape TikTok's Product Lookup really returned on 14 Oct 2026: empty sales_price, the price in original_price.
const looked = {
  id: "1729424445300312067", title: "ELGINI E16028 Seluar Track", shop: { name: "ELGINI MALAYSIA" }, units_sold: 1120325, has_inventory: true,
  commission: { amount: "1.54 - 1.54", currency: "MYR", rate: 500 },
  original_price: { currency: "MYR", maximum_amount: "38", minimum_amount: "38" },
  sales_price: { currency: "", maximum_amount: "", minimum_amount: "" },
};

test("lookup price falls back to original_price when TikTok sends an empty sales_price", () => {
  const r = fromTikTok("link", looked);
  assert.equal(r.priceLo, 38);
  assert.equal(r.priceHi, 38);
  assert.equal(r.rate, 500);
});

test("lookup price uses sales_price when TikTok fills it", () => {
  const r = fromTikTok("link", { ...looked, sales_price: { currency: "MYR", minimum_amount: "29.9", maximum_amount: "35" } });
  assert.equal(r.priceLo, 29.9);
  assert.equal(r.priceHi, 35);
});

test("lookup price is unknown, not zero, when TikTok sends no price", () => {
  const r = fromTikTok("link", { ...looked, original_price: undefined, sales_price: undefined });
  assert.equal(r.priceLo, null);
  assert.equal(r.priceHi, null);
});
