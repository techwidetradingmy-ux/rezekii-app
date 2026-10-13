import { test } from "node:test";
import assert from "node:assert/strict";
import { findProductId, isTikTokUrl } from "./product-id.ts";

const ID = "1729432293062249014";

test("finds the ID in common TikTok Shop link shapes", () => {
  assert.equal(findProductId(`https://shop.tiktok.com/view/product/${ID}?region=MY`), ID);
  assert.equal(findProductId(`https://shop-my.tiktok.com/view/product/${ID}`), ID);
  assert.equal(findProductId(`https://www.tiktok.com/view/product/${ID}?_svg=1`), ID);
  assert.equal(findProductId(`https://www.tiktok.com/shop/pdp/probiotic-plus-30-sachets/${ID}`), ID);
  assert.equal(findProductId(`https://example.com/x?product_id=${ID}&a=b`), ID);
});

test("accepts a bare product ID with spaces around it", () => {
  assert.equal(findProductId(`  ${ID}\n`), ID);
});

test("returns null for short links and non-product links", () => {
  assert.equal(findProductId("https://vt.tiktok.com/ZSabc123/"), null);
  assert.equal(findProductId("https://www.tiktok.com/@tinawellnesshacks/video/7687790603727293716"), null);
  assert.equal(findProductId("hello"), null);
});

test("only TikTok's own https addresses are followed", () => {
  assert.equal(isTikTokUrl("https://vt.tiktok.com/ZSabc123/"), true);
  assert.equal(isTikTokUrl("https://tiktok.com/t/abc"), true);
  assert.equal(isTikTokUrl("http://vt.tiktok.com/ZSabc123/"), false);
  assert.equal(isTikTokUrl("https://tiktok.com.evil.example/x"), false);
  assert.equal(isTikTokUrl("http://169.254.169.254/latest"), false);
  assert.equal(isTikTokUrl("not a link"), false);
});
