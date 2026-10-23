import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_PASSWORD_MIN, cleanEmail, emailLoginProblem, hashPassword, passwordProblem, verifyPassword } from "./password.ts";

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
  // Admin accounts need 12.
  assert.equal(passwordProblem("eleven char", ADMIN_PASSWORD_MIN), "Use at least 12 characters.");
  assert.equal(passwordProblem("twelve chars", ADMIN_PASSWORD_MIN), null);
});

test("email sign-in: added with an email and a password, then each changes on its own with the current password", () => {
  const first = { role: "creator", hasPassword: false, currentOk: false, googleEmail: null };
  assert.equal(emailLoginProblem({ ...first, email: "tina@techwide.my", password: "long enough" }), null);
  assert.equal(emailLoginProblem({ ...first, email: "tina@techwide.my" }), "Choose a password.");
  assert.equal(emailLoginProblem({ ...first, password: "long enough" }), "Enter your email.");
  assert.equal(emailLoginProblem({ ...first, email: null, password: "long enough" }), "Enter a valid email address.");
  assert.equal(emailLoginProblem({ ...first, email: "tina@techwide.my", password: "short" }), "Use at least 8 characters.");
  assert.equal(emailLoginProblem({ ...first, role: "admin", email: "a@techwide.my", password: "long enough", googleEmail: "a@techwide.my" }), "Admin accounts sign in with Google.");
  // Admins who sign in with email and password (made admin in Creators) keep it, with 12 characters.
  assert.equal(emailLoginProblem({ ...first, role: "admin", email: "a@techwide.my", password: "long enough" }), "Use at least 12 characters.");
  assert.equal(emailLoginProblem({ ...first, role: "admin", email: "a@techwide.my", password: "long enough!" }), null);

  const later = { role: "creator", hasPassword: true, currentOk: true, googleEmail: null };
  assert.equal(emailLoginProblem({ ...later, email: "new@techwide.my" }), null); // email only
  assert.equal(emailLoginProblem({ ...later, password: "new password" }), null); // password only
  assert.equal(emailLoginProblem({ ...later }), "Nothing to change.");
  assert.equal(emailLoginProblem({ ...later, currentOk: false, email: "new@techwide.my" }), "Your current password is wrong.");

  // An account that also signs in with Google keeps its Google email.
  assert.equal(emailLoginProblem({ ...first, googleEmail: "Tina@Techwide.my", email: "tina@techwide.my", password: "long enough" }), null);
  assert.equal(emailLoginProblem({ ...first, googleEmail: "tina@techwide.my", email: "other@gmail.com", password: "long enough" }), "This account signs in with Google, so use your Google email.");
});
