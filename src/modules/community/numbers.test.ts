import { test } from "node:test";
import assert from "node:assert/strict";
import { MetaError } from "../../integrations/meta/graph.ts";
import { noteFor, yesterday } from "./numbers.ts";

test("yesterday is Malaysia's yesterday, as a date and its start and end", () => {
  // 23 Oct 2026, 01:30 in Malaysia (22 Oct, 17:30 UTC)
  const y = yesterday(Date.parse("2026-10-22T17:30:00Z"));
  assert.deepEqual(y, { day: "2026-10-22", from: "2026-10-21T16:00:00.000Z", to: "2026-10-22T16:00:00.000Z" });
});

test("a channel that can't be read gets a note an Admin can act on", () => {
  assert.equal(noteFor(new MetaError("Error validating access token", 190)), "The sign-in has ended: connect this channel again.");
  assert.equal(noteFor(new MetaError("(#10) Application does not have permission for this action", 10)), "Connect this channel again to allow Community's numbers.");
  assert.equal(noteFor(new MetaError("(#100) Invalid metric", 100)), "(#100) Invalid metric");
});
