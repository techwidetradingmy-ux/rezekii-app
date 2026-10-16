import { test } from "node:test";
import assert from "node:assert/strict";
import { offersSamples, sampleChoice, sampleVerdict } from "./samples.ts";

// Shapes TikTok's "applicable sample label" really returned on 14 Oct 2026 for @homefithacksofficial.
const baseus = { status: "TO_APPLY", can_apply: true, reach_limit: false, sample_product: { sample_sku_list: [{ id: "a", is_available: false, unavailable_reason: "OUT_OF_STOCK" }, { id: "b", is_available: true }] } };
// And on 16 Oct 2026: the DESSINI casserole (1 campaign sample, none offered) and an ELGINI track pant (the seller's own samples).
const dessini = { status: "UNKNOWN", can_apply: false };
const elgini = { status: "TO_APPLY", can_apply: true, reach_limit: false, sample_product: { sample_sku_list: [{ id: "s1", is_available: false, unavailable_reason: "OUT_OF_STOCK" }, { id: "s2", is_available: true }] } };

test("sampleChoice asks for the first option TikTok allows a sample of", () => {
  assert.deepEqual(sampleChoice(baseus), { ok: true, skuId: "b" });
  assert.deepEqual(sampleChoice(elgini), { ok: true, skuId: "s2" });
});

test("sampleChoice stops before TikTok's page when there is no real sample to ask for", () => {
  const no = (l: Parameters<typeof sampleChoice>[0]) => { const r = sampleChoice(l); return r.ok ? "" : r.error; };
  assert.match(no(dessini), /doesn't offer a free sample/);
  assert.match(no({ ...baseus, application_id: "8071" }), /already requested/);
  assert.match(no({ ...baseus, reach_limit: true }), /limit/);
  assert.match(no({ ...baseus, sample_product: { sample_sku_list: [{ id: "a", is_available: false }] } }), /out of stock/);
  // TikTok listing no sample options, or not answering at all, is never treated as a sample.
  assert.match(no({ status: "TO_APPLY", can_apply: true }), /doesn't offer a free sample/);
  assert.match(no(undefined), /doesn't offer a free sample/);
});

test("sampleVerdict and offersSamples follow TikTok's live check, not the campaign number", () => {
  assert.equal(sampleVerdict(elgini), "available");
  assert.equal(sampleVerdict(dessini), "none");
  assert.equal(sampleVerdict({ ...baseus, application_id: "8071" }), "requested");
  assert.equal(sampleVerdict({ ...baseus, reach_limit: true }), "limit");
  assert.equal(sampleVerdict(undefined), "none");
  assert.equal(offersSamples(elgini), true);
  assert.equal(offersSamples(dessini), false);
  // A creator TikTok won't give one to still sees that the product offers samples.
  assert.equal(offersSamples({ ...elgini, can_apply: false }), true);
  assert.equal(offersSamples({ ...baseus, sample_product: { sample_sku_list: [{ id: "a", is_available: false }] } }), false);
});
