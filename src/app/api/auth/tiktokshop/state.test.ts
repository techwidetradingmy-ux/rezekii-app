import { test } from "node:test";
import assert from "node:assert/strict";
import { newState, stateMatches } from "./state.ts";

test("state is random and URL-safe", () => {
  const a = newState();
  assert.match(a, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(a, newState());
});

test("state check: only an exact match passes", () => {
  const s = newState();
  assert.equal(stateMatches(s, s), true);
  assert.equal(stateMatches(s, newState()), false);
  assert.equal(stateMatches(null, s), false);
  assert.equal(stateMatches(s, undefined), false);
  assert.equal(stateMatches("short", s), false);
});
