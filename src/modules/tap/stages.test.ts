import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStatus, sampleStage, unixSeconds } from "./stages.ts";

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
