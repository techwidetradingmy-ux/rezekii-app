import { test } from "node:test";
import assert from "node:assert/strict";
import type { TapProduct } from "../tap/catalog.ts";
import { bestSelling, closingSoon, creatorCategories, greeting, longDay, pickForYou, postWhen, weekDelta } from "./rules.ts";

const P = (id: string, o: Partial<TapProduct>): TapProduct => ({
  id, name: `Product ${id}`, shop: "Shop A", category: "Blenders", image: null, priceLo: 10, priceHi: 10, openRate: 500, silverRate: 600,
  sold: 0, soldToday: 0, samples: 0, stock: 100, campaigns: 1, campaignName: null, campaignEnd: null, variants: [], asOf: "2026-10-13", ...o,
});

test("today: top category is the one with the most sales, then the most products", () => {
  const cat = new Map([["a", "Pots"], ["b", "Blenders"], ["c", "Blenders"], ["d", null]]);
  assert.deepEqual(creatorCategories([{ productId: "a", paid: 90 }, { productId: "b", paid: 10 }, { productId: "c", paid: 0 }], cat), { top: "Pots", niche: new Set(["Pots", "Blenders"]) });
  assert.equal(creatorCategories([{ productId: "a", paid: 0 }, { productId: "b", paid: 0 }, { productId: "c", paid: 0 }], cat).top, "Blenders");
  assert.deepEqual(creatorCategories([{ productId: "d", paid: 5 }], cat), { top: null, niche: new Set() });
});

test("today: picks favour the top category, keep 2 per category, skip promoted products and fill up with what is selling", () => {
  const all = [
    P("1", { category: "Blenders", soldToday: 1500 }),
    P("2", { category: "Blenders", samples: 2 }),
    P("3", { category: "Blenders", soldToday: 9000 }),
    P("4", { category: "Pots", silverRate: 1200 }),
    P("5", { category: "Serums", soldToday: 50 }),
    P("6", { category: "Pots", soldToday: 2 }),
    P("7", { category: "Bags", soldToday: 40 }),
  ];
  const picks = pickForYou(all, "Blenders", new Set(["Blenders", "Pots"]), new Set(["3"]));
  assert.deepEqual(picks, [
    ["2", "Your top category · free sample"],
    ["1", "Your top category · +1.5k sold today"],
    ["6", "Your niche · +2 sold today"],
    ["4", "Your niche · Silver 12%"],
    ["5", "Selling now · +50 sold today"],
    ["7", "Selling now · +40 sold today"],
  ]);
  // No own categories yet: everything comes from what is selling now.
  assert.equal(pickForYou(all, null, new Set(), new Set())[1][1], "Selling now · +9k sold today");
});

test("today: closing soon counts products and campaigns ending within 30 days", () => {
  const now = 1_800_000_000;
  const all = [
    P("1", { campaignName: "Seyoul", campaignEnd: now + 3 * 86400, silverRate: 1300 }),
    P("2", { campaignName: "Seyoul", campaignEnd: now + 3 * 86400 }),
    P("3", { campaignName: "Olzz", campaignEnd: (now + 10 * 86400) * 1000 }),
    P("4", { campaignName: "Later", campaignEnd: now + 40 * 86400, silverRate: 2000 }),
    P("5", { campaignName: "Gone", campaignEnd: now - 1 }),
  ];
  assert.deepEqual(closingSoon(all, now), { campaigns: 2, products: 3, upto: 13, first: "Seyoul", end: now + 3 * 86400 });
  assert.equal(closingSoon([P("9", {})], now), null);
});

test("today: best selling sorts by units since yesterday or by Silver rate", () => {
  const all = [P("1", { soldToday: 5, silverRate: 900 }), P("2", { soldToday: 50, silverRate: 600 }), P("3", { soldToday: 5, sold: 99, silverRate: 1100 })];
  assert.deepEqual(bestSelling(all, 0), ["2", "3", "1"]);
  assert.deepEqual(bestSelling(all, 1), ["3", "1", "2"]);
});

test("today: week delta, greeting and post times", () => {
  assert.equal(weekDelta(48, 40), "+20%");
  assert.equal(weekDelta(30, 40), "-25%");
  assert.equal(weekDelta(5, 0), "");
  const morning = Date.parse("2026-10-14T01:00:00Z"); // 9:00 am MYT
  assert.equal(greeting(morning), "Good morning");
  assert.equal(longDay(Date.parse("2026-10-13T17:00:00Z")), "Wednesday, 14 October");
  assert.equal(greeting(Date.parse("2026-10-14T12:00:00Z")), "Good evening");
  assert.equal(postWhen(Date.parse("2026-10-14T12:00:00Z"), morning, false), "Today · 8:00 pm");
  assert.equal(postWhen(Date.parse("2026-10-15T04:00:00Z"), morning, false), "Tomorrow · 12:00 pm");
  assert.equal(postWhen(Date.parse("2026-10-13T22:00:00Z"), morning, true), "Posted today · 6:00 am");
  assert.equal(postWhen(Date.parse("2026-10-18T12:00:00Z"), morning, false), "Sun 18 Oct · 8:00 pm");
});
