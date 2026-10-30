import { test } from "node:test";
import assert from "node:assert/strict";
import { shopeeShopItems } from "./products.ts";

process.env.SHOPEE_PARTNER_ID = "2051121";
process.env.SHOPEE_PARTNER_KEY = "test-partner-key";
delete process.env.SHOPEE_SANDBOX;
delete process.env.SHOPEE_PROXY_URL;

test("a shop's live products: every page of the list, then names and first photos, signed as the shop", async () => {
  const calls: URL[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.pathname === "/api/v2/product/get_item_list") {
      return url.searchParams.get("offset") === "0"
        ? new Response(JSON.stringify({ error: "", response: { item: [{ item_id: 1 }, { item_id: 2 }], has_next_page: true, next_offset: 100 } }))
        : new Response(JSON.stringify({ error: "", response: { item: [{ item_id: 3 }], has_next_page: false } }));
    }
    const ids = String(url.searchParams.get("item_id_list")).split(",").map(Number);
    return new Response(JSON.stringify({ error: "", response: { item_list: ids.map((id) => ({ item_id: id, item_name: `Item ${id}`, image: id === 2 ? {} : { image_url_list: [`https://cf/${id}.jpg`] } })) } }));
  }) as typeof fetch;

  assert.deepEqual(await shopeeShopItems("tok", "229437124"), [
    { itemId: 1, name: "Item 1", image: "https://cf/1.jpg" },
    { itemId: 2, name: "Item 2", image: null },
    { itemId: 3, name: "Item 3", image: "https://cf/3.jpg" },
  ]);
  assert.deepEqual(calls.map((u) => u.pathname), ["/api/v2/product/get_item_list", "/api/v2/product/get_item_list", "/api/v2/product/get_item_base_info"]);
  assert.equal(calls[0].searchParams.get("item_status"), "NORMAL");
  assert.equal(calls[0].searchParams.get("shop_id"), "229437124");
  assert.equal(calls[2].searchParams.get("item_id_list"), "1,2,3");
});
