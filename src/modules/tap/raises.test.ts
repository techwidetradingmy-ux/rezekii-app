import { test } from "node:test";
import assert from "node:assert/strict";
import { findMatches, findRaises } from "./raises.ts";
import type { TapProduct } from "./catalog.ts";

const tap = (id: string, openRate: number, silverRate: number) => [id, { id, name: `P${id}`, shop: "Shop", image: null, priceLo: 10, openRate, silverRate } as unknown as TapProduct] as const;
const catalog = new Map([tap("1", 500, 600), tap("2", 1000, 1100), tap("3", 800, 900)]);
// Shapes TikTok's showcase list returned for @tinawellnesshacks on 14 Oct 2026.
const showcase = [
  { id: "1", commission: {} },
  { id: "2", commission: { rate: 1000 }, collaboration: { partner: { name: "TECHWIDE MARKETING SDN BHD" } } },
  { id: "3", commission: { rate: 1200 } },
  { id: "9", commission: { rate: 100 } },
];

test("findRaises flags showcase products not linked to Techwide that pay more through TAP", () => {
  assert.deepEqual(findRaises(showcase, catalog, "bronze").map((r) => [r.productId, r.nowRate, r.tapRate]), [["1", 0, 500]]);
});

test("findRaises uses the Silver rate for Silver and Gold creators", () => {
  assert.deepEqual(findRaises(showcase, catalog, "silver").map((r) => [r.productId, r.tapRate]), [["1", 600]]);
});

test("findRaises leaves out products TikTok rejected in the showcase", () => {
  const rejected = [{ id: "1", commission: {}, status: { added_status: "REJECTED", review_status: "UNAVAILABLE" } }, { id: "3", commission: { rate: 100 }, status: { added_status: "ADDED", review_status: "APPROVED" } }];
  assert.deepEqual(findRaises(rejected, catalog, "bronze").map((r) => r.productId), ["3"]);
});

test("findMatches lists every showcase product also in the Rezekii Marketplace not added through Techwide, whatever it pays", () => {
  assert.deepEqual(findMatches(showcase, catalog, "bronze").map((r) => r.productId), ["1", "3"]);
  const refused = [{ id: "1", status: { added_status: "REJECTED" } }, { id: "3", status: { review_status: "UNAVAILABLE" } }];
  assert.deepEqual(findMatches(refused, catalog, "bronze"), []);
});
