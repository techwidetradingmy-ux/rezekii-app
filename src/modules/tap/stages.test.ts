import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedToShip, awaitingApproval, normalizeStatus, rejected, rowLook, sampleStage, statusLook, unixSeconds } from "./stages.ts";

test("my samples: TikTok sample statuses map to TikTok's five steps", () => {
  assert.equal(normalizeStatus("NotRequested"), "NOT_REQUESTED");
  assert.equal(normalizeStatus("CONTENT_PENDING"), "CONTENT_PENDING");
  assert.equal(normalizeStatus("UnFulfilCancelled"), "UN_FULFIL_CANCELLED");
  assert.equal(sampleStage("NotRequested"), 0);
  assert.equal(sampleStage("PENDING"), 1);
  assert.equal(sampleStage("AwaitingShipment"), 2);
  assert.equal(sampleStage("AwaitingCollection"), 2);
  assert.equal(sampleStage("Shipped"), 3);
  assert.equal(sampleStage("ContentPending"), 4);
  assert.equal(sampleStage("Completed"), 5);
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
  assert.equal(rowLook({ stage: 1, request: { ...base.request, tiktok: "PENDING" } })[0], "Pending approval");
  assert.equal(rowLook({ stage: 3 })[0], "Shipped");
});

test("a request for a product TikTok offers no sample of reads 'No sample'", () => {
  assert.equal(rowLook({ stage: 0, request: { status: "applied", note: null, createdAt: "", updatedAt: "", tiktok: null, noSample: true } })[0], "No sample");
});

test("sample statuses read as TikTok shows them: Pending approval, Approved, Shipped, Delivered, Post criteria met", () => {
  assert.equal(statusLook("Pending")[0], "Pending approval");
  assert.equal(statusLook("AWAITING_SHIPMENT")[0], "Approved");
  assert.equal(statusLook("AwaitingCollection")[0], "Approved");
  assert.equal(statusLook("SHIPPED")[0], "Shipped");
  assert.equal(statusLook("ContentPending")[0], "Delivered");
  assert.equal(statusLook("Completed")[0], "Post criteria met");
  assert.equal(statusLook("UnFulfilCancelled")[0], "Cancelled · unfulfilled");
  assert.equal(statusLook("RejectCancelled")[0], "Rejected");
  assert.equal(rowLook({ stage: 1, status: "Pending" })[0], "Pending approval");
});

test("my samples: a sample the seller rejected is Rejected, apart from other cancellations", () => {
  assert.equal(rejected({ stage: sampleStage("REJECT_CANCELLED"), status: "REJECT_CANCELLED" }), true);
  assert.equal(rejected({ stage: sampleStage("OverdueCancelled"), status: "OverdueCancelled" }), false);
  assert.equal(rejected({ stage: sampleStage("PENDING"), status: "PENDING" }), false);
});

test("my samples: pending approval and approved are separate steps", () => {
  assert.equal(awaitingApproval({ stage: sampleStage("PENDING") }), true);
  assert.equal(approvedToShip({ stage: sampleStage("PENDING") }), false);
  assert.equal(approvedToShip({ stage: sampleStage("AwaitingShipment") }), true);
  assert.equal(awaitingApproval({ stage: sampleStage("SHIPPED") }), false);
});
