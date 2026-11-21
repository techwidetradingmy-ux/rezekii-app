import { test } from "node:test";
import assert from "node:assert/strict";
import { listPosts } from "../posting/store.ts";
import { listSocialPosts } from "./store.ts";

/** A pretend PostgREST table: answers `status=in.(…)` and `limit=` like the real one. */
function fakeTable(rows: { id: string; status: string }[]) {
  return (async (url: string) => {
    const q = new URL(url).searchParams;
    const statuses = (q.get("status") ?? "").replace(/^in\.\(|\)$/g, "").split(",");
    const limit = Number(q.get("limit") ?? 1000);
    return new Response(JSON.stringify(rows.filter((r) => statuses.includes(r.status)).slice(0, limit)));
  }) as typeof fetch;
}

test("a full calendar of scheduled posts never pushes published posts out of the history", async () => {
  const rows = [
    ...Array.from({ length: 300 }, (_, i) => ({ id: `s${i}`, status: "scheduled" })),
    ...Array.from({ length: 115 }, (_, i) => ({ id: `p${i}`, status: "posted" })),
    { id: "c1", status: "cancelled" },
    { id: "f1", status: "failed" },
  ];
  const real = globalThis.fetch;
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY ??= "test";
  globalThis.fetch = fakeTable(rows);
  try {
    const social = await listSocialPosts("u1");
    assert.equal(social.filter((r) => r.status === "posted").length, 115);
    assert.equal(social.filter((r) => r.status === "scheduled").length, 300);
    assert.ok(social.some((r) => r.status === "failed") && !social.some((r) => r.status === "cancelled"));
    assert.equal((await listSocialPosts("u1", 20)).filter((r) => r.status === "posted").length, 20);
    const tiktok = await listPosts("u1");
    assert.equal(tiktok.filter((r) => r.status === "posted").length, 115);
    assert.ok(!tiktok.some((r) => r.status === "cancelled"));
  } finally {
    globalThis.fetch = real;
  }
});
