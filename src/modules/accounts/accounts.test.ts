import { test } from "node:test";
import assert from "node:assert/strict";
import { hashToken } from "./session.ts";
import { roleForGoogle } from "./users.ts";

test("admin role: allow-listed, verified Google email only (case and spaces ignored)", () => {
  process.env.ADMIN_EMAILS = "techwidemarketingai@gmail.com, boss@techwide.my";
  assert.equal(roleForGoogle("TechwideMarketingAI@gmail.com", true), "admin");
  assert.equal(roleForGoogle(" boss@techwide.my ", true), "admin");
  assert.equal(roleForGoogle("techwidemarketingai@gmail.com", false), "creator");
  assert.equal(roleForGoogle("someone@gmail.com", true), "creator");
  assert.equal(roleForGoogle(undefined, true), "creator");
  delete process.env.ADMIN_EMAILS;
  assert.equal(roleForGoogle("techwidemarketingai@gmail.com", true), "admin");
});

test("session tokens are stored only as a SHA-256 hash", () => {
  const h = hashToken("abc");
  assert.equal(h, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.notEqual(h, "abc");
  assert.equal(hashToken("abc"), h);
});
