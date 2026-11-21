import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPublishStatus, parseKeepingIds } from "./posting.ts";

test("a published post's 19-digit ID comes back exactly, not rounded", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7710492037702765844]},"error":{"code":"ok","message":""}}')) as typeof fetch;
  try {
    const r = await fetchPublishStatus("tok", "v_pub_file~1");
    assert.deepEqual(r.data?.publicaly_available_post_id, ["7710492037702765844"]);
    assert.equal(r.error, undefined);
  } finally {
    globalThis.fetch = real;
  }
});

test("short numbers stay numbers, and a reply that isn't JSON reads as empty", () => {
  assert.deepEqual(parseKeepingIds('{"size": 1048576, "ids": [123, 1234567890123456789], "n": -1}'), { size: 1048576, ids: [123, "1234567890123456789"], n: -1 });
  assert.deepEqual(parseKeepingIds("<html>busy</html>"), {});
});
