import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStatus, rowLook, sampleStage, unixSeconds } from "./stages.ts";

test("my tap: TikTok sample statuses map to the mockup stages", () => {
  assert.equal(normalizeStatus("NotRequested"), "NOT_REQUESTED");
  assert.equal(normalizeStatus("CONTENT_PENDING"), "CONTENT_PENDING");
  assert.equal(normalizeStatus("UnFulfilCancelled"), "UN_FULFIL_CANCELLED");
  assert.equal(sampleStage("NotRequested"), 0);
  assert.equal(sampleStage("AwaitingShipment"), 1);
  assert.equal(sampleStage("PENDING"), 1);
  assert.equal(sampleStage("Shipped"), 2);
  assert.equal(sampleStage("AwaitingCollection"), 2);
  assert.equal(sampleStage("ContentPending"), 3);
  assert.equal(sampleStage("Completed"), 4);
  assert.equal(sampleStage("UnFulfilCancelled"), -1);
  assert.equal(sampleStage("Cancelled"), -1);
  assert.equal(sampleStage(""), 0);
});

test("my tap: TikTok dates in seconds or milliseconds", () => {
  assert.equal(unixSeconds("1792598399"), 1792598399);
  assert.equal(unixSeconds(1792598399000), 1792598399);
  assert.equal(unixSeconds(undefined), 0);
  assert.equal(unixSeconds("x"), 0);
});

test("a sample asked on Rezekii that TikTok has no record of is 'not submitted', not a sample status", () => {
  const base = { stage: 0, request: { status: "applied" as const, note: null, createdAt: "", updatedAt: "", tiktok: null } };
  assert.equal(rowLook(base)[0], "Not submitted in TikTok yet");
  assert.equal(rowLook({ stage: 1, request: { ...base.request, tiktok: "PENDING" } })[0], "Sample requested");
  assert.equal(rowLook({ stage: 2 })[0], "Sample on the way");
});

test("a request for a product TikTok offers no sample of reads 'No sample'", () => {
  assert.equal(rowLook({ stage: 0, request: { status: "applied", note: null, createdAt: "", updatedAt: "", tiktok: null, noSample: true } })[0], "No sample");
});
