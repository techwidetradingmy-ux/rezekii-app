import { test } from "node:test";
import assert from "node:assert/strict";
import { signRequest } from "./sign.ts";

// Expected values computed separately in Python from TikTok's published algorithm.
test("signs a POST with body, ignoring sign and access_token", () => {
  const sign = signRequest(
    "/affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch",
    { timestamp: "1700000000", app_key: "abc123", access_token: "IGNORED", sign: "IGNORED" },
    '{"material":{"type":"PRODUCT","ids":["1729432293062249014"]}}',
    "test_secret",
  );
  assert.equal(sign, "3bbf28ee055fb4586ed7f9a6c0d46a6aec2a7dde297c4c8a7e8baf401997ec8e");
});

test("signs a GET without body", () => {
  const sign = signRequest("/affiliate_creator/202508/profiles", { timestamp: "1700000000", app_key: "abc123" }, "", "test_secret");
  assert.equal(sign, "b76745d121852a1957193c5fbbd1721532c191a203bd137ae98cd8a3b77f5e84");
});

test("param order does not change the signature", () => {
  const a = signRequest("/p", { b: "2", a: "1" }, "", "s");
  const b = signRequest("/p", { a: "1", b: "2" }, "", "s");
  assert.equal(a, b);
});
