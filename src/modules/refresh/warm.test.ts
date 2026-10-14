import { test } from "node:test";
import assert from "node:assert/strict";
import { warmSite } from "./warm.ts";

test("the site is warmed every 4 minutes, not on every timer tick", async () => {
  const seen: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => { seen.push(url); return new Response(""); }) as typeof fetch;
  try {
    assert.equal(await warmSite("https://rezekii.com", "t", Date.parse("2026-10-15T01:03:00Z")), 0);
    assert.equal(seen.length, 0);
    const n = await warmSite("https://rezekii.com", "t", Date.parse("2026-10-15T01:04:00Z"));
    assert.equal(seen.length, n);
    assert.ok(seen.includes("https://rezekii.com/app/rankings") && seen.includes("https://rezekii.com/api/rankings/daily"));
  } finally {
    globalThis.fetch = real;
  }
});
