import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { lookupProducts, addShowcaseByLink } from "./creator.ts";
import { campaignProductLink, listCampaigns } from "./partner.ts";
import { partnerAuthUrl, creatorAuthUrl } from "./auth.ts";
import { signRequest } from "./sign.ts";

process.env.TIKTOK_SHOP_APP_KEY = "testkey";
process.env.TIKTOK_SHOP_APP_SECRET = "testsecret";

let calls: { url: URL; init: RequestInit }[] = [];
beforeEach(() => {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    calls.push({ url: new URL(String(input)), init });
    return new Response(JSON.stringify({ code: 0, message: "success", data: {} }), { status: 200 });
  }) as typeof fetch;
});

/** Recomputes the signature from what was actually sent, as TikTok's server would. */
function signatureMatches(call: { url: URL; init: RequestInit }): boolean {
  const params = Object.fromEntries(call.url.searchParams);
  const body = typeof call.init.body === "string" ? call.init.body : "";
  return params.sign === signRequest(call.url.pathname, params, body, "testsecret");
}

test("lookup sends comma-joined product IDs, signed", async () => {
  await lookupProducts("tok", ["111", "222"]);
  const c = calls[0];
  assert.equal(c.url.pathname, "/affiliate_creator/202509/open_collaborations/products");
  assert.equal(c.url.searchParams.get("product_ids"), "111,222");
  assert.equal(c.init.method, "POST");
  assert.equal(c.init.body, undefined);
  assert.equal((c.init.headers as Record<string, string>)["x-tts-access-token"], "tok");
  assert.ok(signatureMatches(c));
});

test("partner calls carry the category asset cipher", async () => {
  await listCampaigns("ptok", "CIPHER1");
  const c = calls[0];
  assert.equal(c.url.searchParams.get("category_asset_cipher"), "CIPHER1");
  assert.equal(c.url.searchParams.get("type"), "MY_CAMPAIGNS");
  assert.equal(c.url.searchParams.get("page_size"), "20");
  assert.ok(signatureMatches(c));
});

test("campaign link without a rate sends no body; with a rate sends it", async () => {
  await campaignProductLink("ptok", "C", "camp1", "prod1");
  assert.equal(calls[0].url.pathname, "/affiliate_partner/202405/campaigns/camp1/products/prod1/promotion_link/generate");
  assert.equal(calls[0].init.body, undefined);
  await campaignProductLink("ptok", "C", "camp1", "prod1", 1500);
  assert.equal(calls[1].init.body, JSON.stringify({ creator_commission_rate: 1500 }));
  assert.ok(signatureMatches(calls[1]));
});

test("showcase add uses PRODUCT_LINK", async () => {
  await addShowcaseByLink("tok", "https://example.test/p");
  assert.equal(calls[0].init.body, JSON.stringify({ add_type: "PRODUCT_LINK", product_link: "https://example.test/p" }));
  assert.ok(signatureMatches(calls[0]));
});

test("auth links: creator uses app key, partner uses service ID; both carry state", () => {
  const cr = new URL(creatorAuthUrl("S1"));
  assert.equal(cr.searchParams.get("app_key"), "testkey");
  assert.equal(cr.searchParams.get("state"), "S1");
  const pa = new URL(partnerAuthUrl("S2"));
  assert.equal(pa.host, "partner.tiktokshop.com");
  assert.equal(pa.searchParams.get("service_id"), "7634095739546650375");
  assert.equal(pa.searchParams.get("state"), "S2");
});
