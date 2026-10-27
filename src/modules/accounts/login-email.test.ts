import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "./password.ts";
import { createEmailUser, emailSignIn, setEmailLogin } from "./users.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";

/**
 * Supabase stand-in: `inUse` is what email_in_use answers; `me` is the signed-in account. Calls are kept to see what was
 * asked and saved.
 */
const hash = await hashPassword("the current password");
let calls: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
let inUse = false;
let me: Record<string, unknown> = {};
beforeEach(() => {
  calls = [];
  inUse = false;
  me = { id: "u1", role: "admin", google_sub: "g-1", password_hash: null, email: "boss@gmail.com" };
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const path = decodeURIComponent(String(input).replace("https://db.test/rest/v1/", ""));
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, method, body });
    if (path === "rpc/email_in_use") return new Response(JSON.stringify(inUse), { status: 200 });
    if (method === "PATCH" || method === "POST") return new Response(JSON.stringify([{ ...me, ...body }]), { status: 201 });
    return new Response(JSON.stringify([me]), { status: 200 });
  }) as typeof fetch;
});
const saved = () => calls.find((c) => c.method === "PATCH" && c.path.startsWith("app_users?id=eq.u1"))?.body ?? null;

test("a Google admin adds a sign-in email different from their Google email; their Google email stays", async () => {
  const r = await setEmailLogin("u1", { email: "office@techwide.my", password: "a long admin password" }, "");
  assert.ok(r.ok);
  const s = saved()!;
  assert.equal(s.login_email, "office@techwide.my");
  assert.ok(!("email" in s), "the Google email isn't touched");
  assert.deepEqual(calls.find((c) => c.path === "rpc/email_in_use")?.body, { p_email: "office@techwide.my", p_except: "u1" });
});

test("a sign-in email another account uses (as sign-in, Google or sign-up email) is refused", async () => {
  inUse = true;
  const r = await setEmailLogin("u1", { email: "taken@techwide.my", password: "a long admin password" }, "");
  assert.deepEqual(r, { ok: false, error: "Another Rezekii account already uses this email.", status: 409 });
  assert.equal(saved(), null);
});

test("an account without Google changes its email and sign-in email together", async () => {
  me = { ...me, role: "creator", google_sub: null, password_hash: hash };
  const r = await setEmailLogin("u1", { email: "new@techwide.my" }, "the current password");
  assert.ok(r.ok);
  assert.deepEqual({ login: saved()!.login_email, email: saved()!.email }, { login: "new@techwide.my", email: "new@techwide.my" });
});

test("signing up with an email another account uses is refused before anything is saved", async () => {
  inUse = true;
  const r = await createEmailUser("boss@gmail.com", "long enough", null);
  assert.equal(r.ok, false);
  assert.ok(!calls.some((c) => c.method === "POST" && c.path.startsWith("app_users")));
});

test("signing up saves the email as the sign-in email too", async () => {
  await createEmailUser("fresh@techwide.my", "long enough", "Fresh");
  const post = calls.find((c) => c.method === "POST" && c.path.startsWith("app_users"))!.body!;
  assert.deepEqual({ email: post.email, login: post.login_email }, { email: "fresh@techwide.my", login: "fresh@techwide.my" });
});

test("email sign-in looks the account up by its sign-in email, in lower case", async () => {
  me = { ...me, password_hash: hash, failed_logins: 0, locked_until: null };
  await emailSignIn("Office@Techwide.my", "the current password");
  assert.match(calls[0].path, /^app_users\?login_email=eq\.office@techwide\.my&/);
});
