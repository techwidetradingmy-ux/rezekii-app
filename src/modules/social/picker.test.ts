import { test } from "node:test";
import assert from "node:assert/strict";
import { brandInput, brandPicked, cleanPick, tiktokKey, toggleBrand, toggleChannel } from "./picker.ts";

const TT1 = tiktokKey("o1"), TT2 = tiktokKey("o2");
const CONNECTED = new Set(["fb1", "fb2", "fb3", "ig1", "th1", TT1, TT2]);
const MENTEGA = ["fb1", "ig1"];

test("B3: nothing is picked until you pick it; a brand switches all its channels on, again switches them off", () => {
  let picked = new Set<string>();
  assert.equal(brandPicked(MENTEGA, picked, CONNECTED), false);
  picked = toggleBrand(picked, MENTEGA, CONNECTED);
  assert.deepEqual([...picked].sort(), ["fb1", "ig1"]);
  assert.equal(brandPicked(MENTEGA, picked, CONNECTED), true);
  picked = toggleBrand(picked, MENTEGA, CONNECTED);
  assert.deepEqual([...picked], []);
});

test("B4: brands combine, a single channel can be added or removed, and a brand with a removed channel shows unpicked", () => {
  let picked = toggleBrand(new Set(), MENTEGA, CONNECTED);
  picked = toggleBrand(picked, ["fb2", "fb3"], CONNECTED);
  picked = toggleChannel(picked, "th1", CONNECTED);
  assert.equal(picked.size, 5);
  picked = toggleChannel(picked, "fb1", CONNECTED);
  assert.equal(brandPicked(MENTEGA, picked, CONNECTED), false);
  assert.equal(picked.has("ig1"), true);
});

test("B5: a disconnected channel drops out of its brand; a brand with nothing connected can't be picked", () => {
  const live = new Set(["ig1"]);
  assert.deepEqual([...toggleBrand(new Set(), MENTEGA, live)], ["ig1"]);
  assert.equal(brandPicked(["fbX"], new Set(), live), false);
  assert.deepEqual([...toggleBrand(new Set(), ["fbX"], live)], []);
});

test("B6: a post goes to one TikTok account; picking another replaces it", () => {
  let picked = toggleChannel(new Set(), TT1, CONNECTED);
  picked = toggleChannel(picked, TT2, CONNECTED);
  assert.deepEqual([...picked], [TT2]);
  assert.deepEqual([...cleanPick([TT1, "fb1", TT2, "gone"], CONNECTED)].sort(), ["fb1", TT2].sort());
});

test("B7: Same as last post keeps only channels that are still connected", () => {
  assert.deepEqual([...cleanPick(["fb1", "fbOld", "ig1"], CONNECTED)], ["fb1", "ig1"]);
});

test("B2: a brand needs a name and at least one of your own channels", () => {
  const mine = new Set(["fb1", "ig1"]);
  assert.deepEqual(brandInput({ name: "  Mentega   Terbang ", channels: ["fb1", "ig1", "fb1", "someone-else"] }, mine), { name: "Mentega Terbang", channels: ["fb1", "ig1"] });
  assert.match((brandInput({ name: "", channels: ["fb1"] }, mine) as { error: string }).error, /name/);
  assert.match((brandInput({ name: "x".repeat(61), channels: ["fb1"] }, mine) as { error: string }).error, /60/);
  assert.match((brandInput({ name: "A", channels: ["nope"] }, mine) as { error: string }).error, /at least one/);
});
