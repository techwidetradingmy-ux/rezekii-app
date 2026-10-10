import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedPartnerDuringProof } from "./partner-connection.ts";

test("partner allow-list: name must contain a listed word, case ignored", () => {
  process.env.PROOF_PARTNER_NAMES = "techwide";
  assert.equal(isAllowedPartnerDuringProof("Techwide Marketing Sdn Bhd"), true);
  assert.equal(isAllowedPartnerDuringProof("TECHWIDE"), true);
  assert.equal(isAllowedPartnerDuringProof("Other Agency"), false);
  assert.equal(isAllowedPartnerDuringProof(""), false);
  process.env.PROOF_PARTNER_NAMES = "";
  assert.equal(isAllowedPartnerDuringProof("Techwide Marketing"), false);
});
