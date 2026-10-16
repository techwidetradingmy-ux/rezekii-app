import { test } from "node:test";
import assert from "node:assert/strict";
import { freshUrl, photoFor, photoPath } from "./store.ts";

const now = Date.parse("2026-10-16T12:00:00Z");
const at = (iso: string) => `https://p16-common-sign.tiktokcdn.com/a.jpeg?x-expires=${Date.parse(iso) / 1000}&x-signature=abc`;

test("photos: a signed TikTok address works until x-expires; unsigned addresses always do", () => {
  assert.equal(freshUrl(at("2026-10-16T13:00:00Z"), now), at("2026-10-16T13:00:00Z"));
  assert.equal(freshUrl(at("2026-10-16T11:00:00Z"), now), null);
  assert.equal(freshUrl(at("2026-10-16T12:05:00Z"), now, 10 * 60_000), null, "needs to last 10 more minutes");
  assert.equal(freshUrl("https://lh3.googleusercontent.com/a/x", now), "https://lh3.googleusercontent.com/a/x");
  assert.equal(freshUrl(null, now), null);
});

test("photos: the saved copy first (refreshed copies get a new address), else a working address, else none", () => {
  const saved = new Map([["mira.beauty", "2026-10-15"]]);
  assert.equal(photoPath("Mira.Beauty", "2026-10-15"), "/api/img/c/mira.beauty?v=20261015");
  assert.equal(photoFor("Mira.Beauty", at("2026-10-01T00:00:00Z"), saved, now), "/api/img/c/mira.beauty?v=20261015");
  assert.equal(photoFor("other", at("2026-10-17T00:00:00Z"), saved, now), at("2026-10-17T00:00:00Z"));
  assert.equal(photoFor("other", at("2026-10-01T00:00:00Z"), saved, now), null);
  assert.equal(photoFor("", "https://lh3.googleusercontent.com/a/x", saved, now), "https://lh3.googleusercontent.com/a/x");
});
