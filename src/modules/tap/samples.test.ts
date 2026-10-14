import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleChoice } from "./samples.ts";

// Shapes TikTok's "applicable sample label" really returned on 14 Oct 2026 for @homefithacksofficial.
const baseus = { status: "TO_APPLY", can_apply: true, reach_limit: false, sample_product: { sample_sku_list: [{ id: "a", is_available: false, unavailable_reason: "OUT_OF_STOCK" }, { id: "b", is_available: true }] } };

test("sampleChoice asks for the first option TikTok allows a sample of", () => {
  assert.deepEqual(sampleChoice(baseus, "fallback"), { ok: true, skuId: "b" });
});

test("sampleChoice stops before TikTok's page when the creator can't ask", () => {
  const no = (l: Parameters<typeof sampleChoice>[0]) => { const r = sampleChoice(l, "fallback"); return r.ok ? "" : r.error; };
  assert.match(no({ status: "UNKNOWN", can_apply: false }), /doesn't offer this sample/);
  assert.match(no({ ...baseus, application_id: "8071" }), /already requested/);
  assert.match(no({ ...baseus, reach_limit: true }), /limit/);
  assert.match(no({ ...baseus, sample_product: { sample_sku_list: [{ id: "a", is_available: false }] } }), /out of stock/);
});

test("sampleChoice falls back to the option with most stock only when TikTok's check didn't answer", () => {
  assert.deepEqual(sampleChoice(undefined, "fallback"), { ok: true, skuId: "fallback" });
});
