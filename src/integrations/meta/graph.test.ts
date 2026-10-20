import { test } from "node:test";
import assert from "node:assert/strict";
import { MetaError } from "./graph.ts";

test("P11: Meta's 'object does not exist' answer means the post was deleted; sign-in and other errors don't", () => {
  assert.equal(new MetaError("Unsupported get request. Object with ID '1' does not exist", 100, 33).gone, true);
  assert.equal(new MetaError("Object with ID '1' does not exist, cannot be loaded due to missing permissions", 100).gone, true);
  assert.equal(new MetaError("Error validating access token", 190).gone, false);
  assert.equal(new MetaError("Please reduce the amount of data", 100, 1).gone, false);
  assert.equal(new MetaError("Error validating access token", 190).needsReconnect, true);
});
