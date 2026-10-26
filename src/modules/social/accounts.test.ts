import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { MetaError } from "../../integrations/meta/graph.ts";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import { accountsForPictures, refreshPicture, type SocialAccount } from "./accounts.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

/** Supabase answers every call with an empty list; Meta answers with `meta`. */
let calls: { url: string; init: RequestInit }[] = [];
let meta: { status: number; body: unknown } = { status: 200, body: {} };
beforeEach(() => {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith("https://db.test/")) return new Response("[]", { status: 200 });
    return new Response(JSON.stringify(meta.body), { status: meta.status });
  }) as typeof fetch;
});

const page = (): SocialAccount => ({
  id: "acc1", user_id: "u1", platform: "facebook", external_id: "123", name: "21st Bags", username: null, avatar_url: null,
  account_type: null, token_enc: encryptToken("page-token"), token_expires_at: null, status: "active", connected_at: "2026-10-01T00:00:00Z",
});
const patches = () => calls.filter((c) => c.init.method === "PATCH" && c.url.includes("social_accounts?id=eq.acc1")).map((c) => JSON.parse(String(c.init.body)));

test("the daily sign-in check picks channels not checked for a day", async () => {
  await accountsForPictures(5);
  const before = Date.parse(decodeURIComponent(calls[0].url.split("avatar_checked_at=lt.")[1].split("&")[0]));
  assert.ok(Math.abs(Date.now() - 86400e3 - before) < 60_000);
  assert.match(calls[0].url, /status=eq\.active/);
});

test("the sign-in check marks a channel Reconnect when Meta says the sign-in has ended (190)", async () => {
  meta = { status: 400, body: { error: { message: "Error validating access token", code: 190 } } };
  assert.equal(await refreshPicture(page()), "needs reconnecting");
  const sent = patches();
  assert.ok(sent.some((b) => b.status === "reconnect"));
  // The check time still moves on, and no picture is saved.
  assert.ok(sent.some((b) => b.avatar_checked_at && !("avatar_url" in b)));
});

test("any other Meta error fails the check as before and doesn't mark the channel", async () => {
  meta = { status: 400, body: { error: { message: "(#4) Application request limit reached", code: 4 } } };
  await assert.rejects(refreshPicture(page()), (err) => err instanceof MetaError && err.code === 4);
  const sent = patches();
  assert.ok(!sent.some((b) => b.status === "reconnect"));
  assert.ok(sent.some((b) => b.avatar_checked_at));
});

test("a working sign-in saves the picture", async () => {
  meta = { status: 200, body: { picture: { data: { url: "https://x/p.jpg" } } } };
  assert.equal(await refreshPicture(page()), "picture refreshed");
  assert.deepEqual(patches().map((b) => b.avatar_url), ["https://x/p.jpg"]);
});
