import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import { checkTikTokConnection, freshTikTokToken, RECONNECT_TIKTOK } from "./store.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.TIKTOK_CLIENT_KEY = "key";
process.env.TIKTOK_CLIENT_SECRET = "secret";

/** The saved connection Supabase answers with; TikTok's token and user-info replies. */
let calls: { url: string; init: RequestInit }[] = [];
let row: Record<string, unknown> = {};
let tokenReply: unknown = {};
let userReply: unknown = {};
beforeEach(() => {
  calls = [];
  row = { access_token_enc: encryptToken("old-access"), access_token_expires_at: new Date(Date.now() - 60e3).toISOString(), refresh_token_enc: encryptToken("refresh"), status: "active" };
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith("https://db.test/")) return new Response(init.method ? "" : JSON.stringify([row]), { status: 200 });
    if (url.includes("/oauth/token/")) return new Response(JSON.stringify(tokenReply), { status: 200 });
    return new Response(JSON.stringify(userReply), { status: 200 });
  }) as typeof fetch;
});

const marked = () => calls.filter((c) => c.init.method === "PATCH" && c.url.includes("tiktok_connections")).map((c) => JSON.parse(String(c.init.body)).status);
const toTikTok = () => calls.filter((c) => !c.url.startsWith("https://db.test/"));

test("TikTok refusing to renew (invalid_grant) marks the connection Reconnect", async () => {
  tokenReply = { error: "invalid_grant", error_description: "Refresh token is invalid or expired." };
  await assert.rejects(freshTikTokToken("oid"), { message: RECONNECT_TIKTOK });
  assert.deepEqual(marked(), ["reconnect"]);
});

test("any other renewal error (TikTok busy) fails without marking the connection", async () => {
  tokenReply = { error: "server_error" };
  await assert.rejects(freshTikTokToken("oid"), /server_error/);
  assert.deepEqual(marked(), []);
});

test("a connection already marked Reconnect isn't sent to TikTok", async () => {
  row.status = "reconnect";
  await assert.rejects(freshTikTokToken("oid"), { message: RECONNECT_TIKTOK });
  assert.equal(toTikTok().length, 0);
});

test("Check now: a working connection is active again, even if it was marked", async () => {
  row = { ...row, status: "reconnect", access_token_expires_at: new Date(Date.now() + 3600e3).toISOString() };
  userReply = { data: { user: { open_id: "oid" } }, error: { code: "ok", message: "" } };
  assert.equal(await checkTikTokConnection("oid"), "active");
  assert.deepEqual(marked(), ["active"]);
});

test("Check now: TikTok rejecting the access token marks it Reconnect", async () => {
  row.access_token_expires_at = new Date(Date.now() + 3600e3).toISOString();
  userReply = { data: {}, error: { code: "access_token_invalid", message: "The access token is invalid or not found in the request." } };
  assert.equal(await checkTikTokConnection("oid"), "reconnect");
  assert.deepEqual(marked(), ["reconnect"]);
});

test("Check now: a renewal TikTok refuses answers reconnect", async () => {
  tokenReply = { error: "invalid_grant" };
  assert.equal(await checkTikTokConnection("oid"), "reconnect");
});
