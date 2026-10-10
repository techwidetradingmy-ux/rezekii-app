import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptToken, encryptToken } from "./token-crypto.ts";
import { isAllowedDuringProof } from "./affiliate-connections.ts";

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
