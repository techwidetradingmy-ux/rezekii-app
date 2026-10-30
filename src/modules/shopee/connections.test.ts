import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { exchangeShopeeCode, shopeeAuthUrl, shopeeSign, ShopeeError } from "../../integrations/shopee/client.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";
import { checkShopee, freshShopeeToken, RECONNECT_SHOPEE, renameShopee, shopeeLabel, type ShopeeConnection } from "./connections.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.SHOPEE_PARTNER_ID = "1250555";
process.env.SHOPEE_PARTNER_KEY = "test-partner-key";
process.env.SHOPEE_SANDBOX = "1";

/** Supabase answers every call with an empty list; Shopee answers with `shopee`. */
let calls: { url: string; init: RequestInit }[] = [];
let shopee: { status: number; body: unknown } = { status: 200, body: {} };
beforeEach(() => {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith("https://db.test/")) return new Response("[]", { status: 200 });
    return new Response(JSON.stringify(shopee.body), { status: shopee.status });
  }) as typeof fetch;
});

const conn = (over: Partial<ShopeeConnection> = {}): ShopeeConnection => ({
  id: "c1", user_id: "u1", shopee_user_id: "777", shop_id: null, role: "affiliate", name: null, nickname: null, avatar_url: null,
  access_token_enc: encryptToken("old-access"), access_expires_at: new Date(Date.now() + 2 * 3600e3).toISOString(),
  refresh_token_enc: encryptToken("old-refresh"), refresh_expires_at: new Date(Date.now() + 20 * 86400e3).toISOString(),
  status: "active", connected_at: "2026-10-28T00:00:00Z", ...over,
});
const shopeeCalls = () => calls.filter((c) => !c.url.startsWith("https://db.test/"));
const patches = () => calls.filter((c) => c.init.method === "PATCH" && c.url.includes("shopee_connections?id=eq.c1")).map((c) => JSON.parse(String(c.init.body)));

test("the sign is HMAC-SHA256 of partner_id + path + timestamp, keyed with the partner key, in lowercase hex", () => {
  const want = createHmac("sha256", "k").update("1250555/api/v2/auth/token/get1700000000").digest("hex");
  assert.equal(shopeeSign("k", 1250555, "/api/v2/auth/token/get", 1700000000), want);
  assert.match(want, /^[0-9a-f]{64}$/);
});

test("sellers sign in as their shop, affiliates as a user, on the sandbox sign-in page", () => {
  const seller = new URL(shopeeAuthUrl("seller", "https://rezekii.com/api/auth/shopee/callback", "st1"));
  assert.equal(seller.origin + seller.pathname, "https://open.sandbox.test-stable.shopee.com/auth");
  assert.equal(seller.searchParams.get("auth_type"), "seller");
  assert.equal(seller.searchParams.get("partner_id"), "1250555");
  assert.equal(seller.searchParams.get("redirect_uri"), "https://rezekii.com/api/auth/shopee/callback");
  assert.equal(seller.searchParams.get("response_type"), "code");
  assert.equal(seller.searchParams.get("state"), "st1");
  assert.equal(new URL(shopeeAuthUrl("affiliate", "https://rezekii.com/x", "s")).searchParams.get("auth_type"), "user");
});

test("a seller's code is exchanged on its own (no shop_id, so Video calls work), signed, and both ids come back", async () => {
  shopee = { status: 200, body: { error: "", access_token: "a", refresh_token: "r", expire_in: 14400, shop_id_list: [5001], user_id_list: [9001] } };
  const t = await exchangeShopeeCode("code1");
  assert.deepEqual(t, { userId: "9001", shopId: "5001", accessToken: "a", refreshToken: "r", expiresIn: 14400 });
  const [c] = shopeeCalls();
  const u = new URL(c.url);
  assert.equal(u.origin + u.pathname, "https://openplatform.sandbox.test-stable.shopee.sg/api/v2/auth/token/get");
  assert.equal(u.searchParams.get("sign"), shopeeSign("test-partner-key", 1250555, "/api/v2/auth/token/get", u.searchParams.get("timestamp")!));
  assert.deepEqual(JSON.parse(String(c.init.body)), { code: "code1", partner_id: 1250555 });
});

test("a sign-in without a user_id is refused", async () => {
  shopee = { status: 200, body: { error: "", access_token: "a", refresh_token: "r", expire_in: 14400, shop_id_list: [5001] } };
  await assert.rejects(exchangeShopeeCode("code3"), (err) => err instanceof ShopeeError && err.code === "no_account");
});

test("an affiliate's code gives only a user_id; an expiry sent as a Unix time is read as seconds from now", async () => {
  shopee = { status: 200, body: { error: "", access_token: "a", refresh_token: "r", expire_in: Math.floor(Date.now() / 1000) + 14400, user_id_list: [42] } };
  const t = await exchangeShopeeCode("code2");
  assert.equal(t.userId, "42");
  assert.equal(t.shopId, null);
  assert.ok(Math.abs(t.expiresIn - 14400) <= 2);
  assert.deepEqual(JSON.parse(String(shopeeCalls()[0].init.body)), { code: "code2", partner_id: 1250555 });
});

test("Shopee's error comes back with its own code and message", async () => {
  shopee = { status: 200, body: { error: "invalid_code", message: "The code is expired or used or invalid, please check the code." } };
  await assert.rejects(exchangeShopeeCode("bad"), (err) => err instanceof ShopeeError && err.code === "invalid_code" && !err.needsReconnect);
});

test("a token with over 10 minutes left is used as it is, without asking Shopee", async () => {
  assert.equal(await freshShopeeToken(conn()), "old-access");
  assert.equal(shopeeCalls().length, 0);
});

test("a token about to run out is renewed: an affiliate by user_id, and both new tokens are saved", async () => {
  shopee = { status: 200, body: { error: "", access_token: "new-access", refresh_token: "new-refresh", expire_in: 14400, user_id: 777 } };
  assert.equal(await freshShopeeToken(conn({ access_expires_at: new Date(Date.now() + 60e3).toISOString() })), "new-access");
  const [c] = shopeeCalls();
  assert.match(c.url, /\/api\/v2\/auth\/access_token\/get\?/);
  assert.deepEqual(JSON.parse(String(c.init.body)), { refresh_token: "old-refresh", partner_id: 1250555, user_id: 777 });
  const [saved] = patches();
  assert.equal(decryptToken(saved.access_token_enc), "new-access");
  assert.equal(decryptToken(saved.refresh_token_enc), "new-refresh");
  assert.ok(Math.abs(Date.parse(saved.refresh_expires_at) - Date.now() - 30 * 86400e3) < 60e3);
  assert.equal(saved.status, "active");
});

test("a seller's token is renewed with its user_id too, not its shop_id (Video calls are made as the user)", async () => {
  shopee = { status: 200, body: { error: "", access_token: "n", refresh_token: "m", expire_in: 14400 } };
  await freshShopeeToken(conn({ role: "seller", shop_id: "5001", access_expires_at: new Date(Date.now() - 1).toISOString() }));
  assert.deepEqual(JSON.parse(String(shopeeCalls()[0].init.body)), { refresh_token: "old-refresh", partner_id: 1250555, user_id: 777 });
});

test("Shopee refusing the refresh token marks the channel Reconnect", async () => {
  shopee = { status: 200, body: { error: "refresh_token_expired", message: "Your refresh_token expired." } };
  await assert.rejects(freshShopeeToken(conn({ access_expires_at: new Date(Date.now() - 1).toISOString() })), { message: RECONNECT_SHOPEE });
  assert.deepEqual(patches().map((b) => b.status), ["reconnect"]);
});

test("a channel already marked Reconnect isn't used", async () => {
  await assert.rejects(freshShopeeToken(conn({ status: "reconnect" })), { message: RECONNECT_SHOPEE });
  assert.equal(shopeeCalls().length, 0);
});

test("Check now renews the sign-in: working is active (again), refused is reconnect, a Shopee outage is an error", async () => {
  shopee = { status: 200, body: { error: "", access_token: "n", refresh_token: "m", expire_in: 14400 } };
  assert.equal(await checkShopee(conn({ status: "reconnect" })), "active");
  assert.equal(patches().at(-1).status, "active");
  shopee = { status: 200, body: { error: "error_shop_refresh_token", message: "Your refresh token is error" } };
  assert.equal(await checkShopee(conn()), "reconnect");
  shopee = { status: 500, body: { error: "error_server", message: "Something wrong. Please try later." } };
  await assert.rejects(checkShopee(conn()), (err) => err instanceof ShopeeError && err.code === "error_server");
});

test("rename: the owner's name is saved trimmed (up to 60 characters); empty goes back to the usual name", async () => {
  await renameShopee("u1", "c1", "  @homefithacks  ");
  await renameShopee("u1", "c1", "   ");
  const bodies = calls.filter((c) => c.init.method === "PATCH" && c.url.includes("shopee_connections?id=eq.c1&user_id=eq.u1")).map((c) => JSON.parse(String(c.init.body)).nickname);
  assert.deepEqual(bodies, ["@homefithacks", null]);
  assert.equal(shopeeLabel({ nickname: "@homefithacks", name: null, role: "affiliate" }), "@homefithacks");
  assert.equal(shopeeLabel({ nickname: null, name: "Spinelief+", role: "seller" }), "Spinelief+");
  assert.equal(shopeeLabel({ nickname: null, name: null, role: "affiliate" }), "Shopee affiliate");
});
