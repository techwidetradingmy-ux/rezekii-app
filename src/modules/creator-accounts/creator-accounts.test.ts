import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptToken, encryptToken } from "./token-crypto.ts";
import { isAllowedDuringProof } from "./affiliate-connections.ts";
import { linkCreator } from "./access.ts";

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("token encryption round-trips and never stores the plain token", () => {
  const stored = encryptToken("ROW_secret_token_value");
  assert.ok(!stored.includes("ROW_secret_token_value"));
  assert.equal(decryptToken(stored), "ROW_secret_token_value");
});

test("same token encrypts differently each time", () => {
  assert.notEqual(encryptToken("abc"), encryptToken("abc"));
});

test("a tampered token is rejected", () => {
  const [iv, tag, data] = encryptToken("abc").split(".");
  const flipped = Buffer.from(data, "base64url");
  flipped[0] ^= 1;
  assert.throws(() => decryptToken([iv, tag, flipped.toString("base64url")].join(".")));
});

test("a wrong-size key is refused", () => {
  const saved = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = "short";
  assert.throws(() => encryptToken("abc"), /32 bytes/);
  process.env.TOKEN_ENCRYPTION_KEY = saved;
});

test("proof allow-list: only listed handles, case and @ ignored", () => {
  process.env.PROOF_ALLOWED_HANDLES = "tinawellnesshacks, other_one";
  assert.equal(isAllowedDuringProof("tinawellnesshacks"), true);
  assert.equal(isAllowedDuringProof("@TinaWellnessHacks"), true);
  assert.equal(isAllowedDuringProof("other_one"), true);
  assert.equal(isAllowedDuringProof("someone_else"), false);
  assert.equal(isAllowedDuringProof(""), false);
  process.env.PROOF_ALLOWED_HANDLES = "";
  assert.equal(isAllowedDuringProof("tinawellnesshacks"), false);
});

test("no 25-creator limit: with 30 creators already linked, the next one is linked, not put on the waitlist", async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SECRET_KEY = "secret";
  const calls: { path: string; method: string; body: { status?: string } | null }[] = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const path = decodeURIComponent(String(input).replace("https://db.test/rest/v1/", ""));
    calls.push({ path, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : null });
    // Every count says 30 accounts are linked already; every lookup finds nothing.
    return new Response("[]", { status: 200, headers: { "content-range": "0-0/30" } });
  }) as typeof fetch;
  const tokens = { access_token: "a", access_token_expire_in: 2_000_000_000, refresh_token: "r", refresh_token_expire_in: 2_000_000_000 };
  const result = await linkCreator({ id: "u31", role: "creator", tiktok_username: "new_creator" }, { openId: "OPEN31", username: "New_Creator" }, tokens);
  assert.equal(result, "waiting");
  assert.ok(calls.some((c) => c.method === "POST" && c.path.startsWith("affiliate_connections")), "the TikTok Shop link is saved");
  assert.equal(calls.find((c) => c.method === "POST" && c.path.startsWith("creator_access"))?.body?.status, "waiting");
});
