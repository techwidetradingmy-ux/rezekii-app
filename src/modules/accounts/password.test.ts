import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEmail, hashPassword, passwordProblem, verifyPassword } from "./password.ts";

test("password: hash and verify", async () => {
  const h = await hashPassword("correct horse battery");
  assert.match(h, /^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("correct horse batterY", h), false);
  assert.notEqual(await hashPassword("correct horse battery"), h); // new salt each time
});

test("password: malformed or missing hashes never match", async () => {
  assert.equal(await verifyPassword("x", null), false);
  assert.equal(await verifyPassword("x", ""), false);
  assert.equal(await verifyPassword("x", "scrypt$1$2"), false);
  assert.equal(await verifyPassword("x", "bcrypt$16384$8$1$abc$def"), false);
});

test("password: email and length rules", () => {
  assert.equal(cleanEmail("  Reviewer@Rezekii.COM "), "reviewer@rezekii.com");
  assert.equal(cleanEmail("no-at-sign"), null);
  assert.equal(cleanEmail("a@b"), null);
  assert.equal(passwordProblem("short"), "Use at least 8 characters.");
  assert.equal(passwordProblem("long enough"), null);
  assert.equal(passwordProblem("x".repeat(129)), "Use at most 128 characters.");
});
