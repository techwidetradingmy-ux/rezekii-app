import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "./password.ts";
import { emailSignIn } from "./users.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";

/** Supabase stand-in: the account found by email, the admin list added in Settings, and what the sign-in saves. */
const hash = await hashPassword("a long admin password");
let saved: Record<string, unknown> | null = null;
let account: Record<string, unknown> = {};
beforeEach(() => {
  saved = null;
  account = { id: "a1", password_hash: hash, failed_logins: 0, locked_until: null, role: "admin", email: "boss@techwide.my", google_sub: "g-1" };
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const path = decodeURIComponent(String(input).replace("https://db.test/rest/v1/", ""));
    if (init.method === "PATCH") {
      saved = JSON.parse(String(init.body));
      return new Response(JSON.stringify([{ ...account, ...saved }]), { status: 200 });
    }
    if (path.startsWith("admin_emails")) return new Response("[]", { status: 200 });
    return new Response(JSON.stringify([account]), { status: 200 });
  }) as typeof fetch;
});

test("a Google admin on the admin list signs in with their password and stays admin", async () => {
  process.env.ADMIN_EMAILS = "boss@techwide.my";
  const r = await emailSignIn("boss@techwide.my", "a long admin password");
  assert.ok(r.ok);
  assert.ok(saved && !("role" in saved));
});

test("a Google admin taken off the admin list gets a creator account when signing in with their password", async () => {
  process.env.ADMIN_EMAILS = "someone-else@techwide.my";
  const r = await emailSignIn("boss@techwide.my", "a long admin password");
  assert.ok(r.ok);
  assert.equal(saved?.role, "creator");
});

test("an email-only admin (made admin in Creators, not on the Google list) stays admin", async () => {
  process.env.ADMIN_EMAILS = "someone-else@techwide.my";
  account.google_sub = null;
  const r = await emailSignIn("boss@techwide.my", "a long admin password");
  assert.ok(r.ok);
  assert.ok(saved && !("role" in saved));
});

test("a wrong password still fails for admins", async () => {
  const r = await emailSignIn("boss@techwide.my", "not the password");
  assert.equal(r.ok, false);
});
