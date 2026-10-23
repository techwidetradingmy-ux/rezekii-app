import { test } from "node:test";
import assert from "node:assert/strict";
import { warmSite } from "./warm.ts";

test("the site is warmed every 15 minutes from 7 am to 1 am Malaysia time, not on every timer tick", async () => {
  const seen: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => { seen.push(url); return new Response(""); }) as typeof fetch;
  try {
    assert.equal(await warmSite("https://rezekii.com", "t", Date.parse("2026-10-15T01:03:00Z")), 0);
    assert.equal(seen.length, 0);
    assert.equal(await warmSite("https://rezekii.com", "t", Date.parse("2026-10-15T01:04:00Z")), 0);
    // 2:00 am and 6:45 am Malaysia time: night, no warm-up.
    assert.equal(await warmSite("https://rezekii.com", "t", Date.parse("2026-10-14T18:00:00Z")), 0);
    assert.equal(await warmSite("https://rezekii.com", "t", Date.parse("2026-10-14T22:45:00Z")), 0);
    assert.equal(seen.length, 0);
    // 9:15 am Malaysia time.
    const n = await warmSite("https://rezekii.com", "t", Date.parse("2026-10-15T01:15:00Z"));
    assert.equal(seen.length, n);
    assert.ok(seen.includes("https://rezekii.com/app/rankings") && seen.includes("https://rezekii.com/api/rankings/daily"));
  } finally {
    globalThis.fetch = real;
  }
});
