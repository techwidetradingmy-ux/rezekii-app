import { test } from "node:test";
import assert from "node:assert/strict";

process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const { makePass, readPass } = await import("./connect-pass.ts");

const ID = "0e0f59b1-bd9c-429b-bd0d-e9e6f74ca62a";

test("a fresh pass gives back its account", () => {
  assert.equal(readPass(makePass(ID)), ID);
});

test("a pass ends after 10 minutes", () => {
  const made = Date.now();
  const pass = makePass(ID, made);
  assert.equal(readPass(pass, made + 9 * 60_000), ID);
  assert.equal(readPass(pass, made + 10 * 60_000 + 1), null);
});

test("a changed pass is refused", () => {
  const pass = makePass(ID);
  const [body, sig] = pass.split(".");
  const other = Buffer.from(`11111111-2222-3333-4444-555555555555.${Date.now() + 600_000}`).toString("base64url");
  assert.equal(readPass(`${other}.${sig}`), null);
  assert.equal(readPass(`${body}.${sig.slice(0, -2)}xx`), null);
  assert.equal(readPass("nonsense"), null);
  assert.equal(readPass(null), null);
});
