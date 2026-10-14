import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, notPublished } from "./steps.ts";

test("notPublished: TikTok's reply for a list it hasn't published yet, and nothing else", () => {
  const late = "Invalid Parameter. Parameter `date` received `2026-10-13`, but date must be on or before 2026-10-12. Use a date no later than the stated latest available date and retry.";
  assert.equal(notPublished(new ApiError(28001022, late)), true);
  assert.equal(notPublished(new ApiError(28001022, "Invalid Parameter. Parameter `time_slot` is invalid.")), false);
  assert.equal(notPublished(new Error(late)), false);
});
