import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedPartnerDuringProof } from "./partner-connection.ts";

test("partner allow-list: exact TikTok partner ID only", () => {
  process.env.PROOF_PARTNER_IDS = "7494874029665716941, 111";
  assert.equal(isAllowedPartnerDuringProof("7494874029665716941"), true);
  assert.equal(isAllowedPartnerDuringProof("111"), true);
  assert.equal(isAllowedPartnerDuringProof("749487402966571694"), false);
  assert.equal(isAllowedPartnerDuringProof(""), false);
  assert.equal(isAllowedPartnerDuringProof(undefined), false);
  process.env.PROOF_PARTNER_IDS = "";
  assert.equal(isAllowedPartnerDuringProof("7494874029665716941"), false);
});
