import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedSellerDuringProof } from "./seller-connection.ts";

test("seller allow-list: shop names, any case, nothing else", () => {
  process.env.PROOF_SELLER_SHOPS = "Zemvello Wellness, Other Shop";
  assert.equal(isAllowedSellerDuringProof("Zemvello Wellness"), true);
  assert.equal(isAllowedSellerDuringProof("  zemvello wellness "), true);
  assert.equal(isAllowedSellerDuringProof("Other Shop"), true);
  assert.equal(isAllowedSellerDuringProof("Zemvello"), false);
  assert.equal(isAllowedSellerDuringProof(""), false);
  assert.equal(isAllowedSellerDuringProof(undefined), false);
  process.env.PROOF_SELLER_SHOPS = "";
  assert.equal(isAllowedSellerDuringProof("Zemvello Wellness"), false);
});
