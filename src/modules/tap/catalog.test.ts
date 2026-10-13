import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanQuery, creatorRateFor } from "./catalog.ts";
import { pct, perSale, priceRange, rm, short } from "../../app/app/marketplace/format.ts";

test("tap catalog: search text keeps only letters, digits and spaces", () => {
  assert.equal(cleanQuery("  Serum, (vitamin-C)*  "), "Serum vitamin C");
  assert.equal(cleanQuery("kasut.ilike.*,or=(x)"), "kasut ilike or x");
  assert.equal(cleanQuery("Tudung 印花"), "Tudung 印花");
  assert.equal(cleanQuery("a".repeat(80)).length, 60);
});

test("tap catalog: Bronze gets the open rate, Silver and Gold one point more, capped at the campaign total", () => {
  assert.equal(creatorRateFor("bronze", 500, 1000), 500);
  assert.equal(creatorRateFor("silver", 500, 1000), 600);
  assert.equal(creatorRateFor("gold", 500, 550), 550);
  assert.equal(creatorRateFor("silver", 500, null), 600);
});

test("tap marketplace: display formats", () => {
  assert.equal(pct(500), "5%");
  assert.equal(pct(650), "6.5%");
  assert.equal(pct(null), "—");
  assert.equal(rm(30.9), "RM30.90");
  assert.equal(rm(1234.5), "RM1,235");
  assert.equal(priceRange(30.9, 30.9), "RM30.90");
  assert.equal(priceRange(10, 25), "RM10.00 – RM25.00");
  assert.equal(short(950), "950");
  assert.equal(short(12_400), "12.4k");
  assert.equal(short(2_000_000), "2M");
  assert.equal(perSale(30.9, 500), "RM1.55");
  assert.equal(perSale(null, 500), "—");
});
