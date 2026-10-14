import { test } from "node:test";
import assert from "node:assert/strict";
import type { TapProduct } from "../tap/catalog.ts";
import { SEASONS, activeSeasons, bestCategories, bestSelling, closingSoon, creatorCategories, greeting, longDay, pickForYou, postWhen, weekDelta } from "./rules.ts";

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

test("today: picks favour the creator's top category, keep 2 per category, skip promoted products and fill up with what is selling", () => {
  const all = [
    P("1", { category: "Blenders", soldToday: 1500 }),
    P("2", { category: "Blenders", samples: 2 }),
    P("3", { category: "Blenders", soldToday: 9000 }),
    P("4", { category: "Pots", silverRate: 1200 }),
    P("5", { category: "Serums", soldToday: 50 }),
    P("6", { category: "Pots", soldToday: 2 }),
    P("7", { category: "Bags", soldToday: 40 }),
  ];
  const none = { top: null, niche: new Set<string>(), best: new Set<string>(), seasons: [] };
  assert.deepEqual(pickForYou(all, { ...none, top: "Blenders", niche: new Set(["Blenders", "Pots"]) }, new Set(["3"])), ["2", "1", "6", "4", "5", "7"]);
  // No own categories yet: free samples first, then what is selling now.
  assert.deepEqual(pickForYou(all, none, new Set()).slice(0, 2), ["2", "3"]);
});

test("today: best sellers this month and a season coming up lift products, at most 3 seasonal ones outside the creator's niche", () => {
  const raya = SEASONS.find((x) => x.name === "Raya")!;
  const all = [
    P("t1", { category: "Fitness Machines", name: "Walking pad treadmill" }),
    P("t2", { category: "Fitness Machines", name: "Foldable treadmill" }),
    P("r1", { category: "Muslim Wear", name: "Baju Kurung Moden Raya 2027", soldToday: 5 }),
    P("r2", { category: "Muslim Wear", name: "Kebaya Nyonya" }),
    P("r3", { category: "Snacks", name: "Kuih Raya Tart Nenas" }),
    P("r4", { category: "Snacks", name: "Biskut Raya Almond London" }),
    P("x", { category: "Pots", soldToday: 9000 }),
  ];
  const picks = pickForYou(all, { top: null, niche: new Set(), best: new Set(["Fitness Machines"]), seasons: [raya] }, new Set());
  assert.ok(picks.includes("t1") && picks.includes("t2"));
  assert.equal(picks.filter((id) => id.startsWith("r")).length, 3);
  assert.ok(picks.includes("x"));
});

test("today: seasons switch on 6 weeks before and stay a few days after", () => {
  const on = (iso: string) => activeSeasons(Date.parse(iso)).map((x) => x.name);
  assert.deepEqual(on("2026-10-15T12:00:00+08:00"), ["Deepavali"]);
  assert.ok(on("2027-01-30T12:00:00+08:00").includes("Raya") && on("2027-01-30T12:00:00+08:00").includes("Chinese New Year"));
  assert.ok(!on("2027-01-20T12:00:00+08:00").includes("Raya"));
  assert.ok(!on("2027-03-26T12:00:00+08:00").includes("Raya"));
});

test("today: best categories add up a creator's top products by sales", () => {
  const cat = new Map([["a", "Fitness Machines"], ["b", "Fitness Machines"], ["c", "Pedometers"], ["d", "Pots"]]);
  assert.deepEqual([...bestCategories([{ productId: "c", gmv: 90 }, { productId: "a", gmv: 60 }, { productId: "b", gmv: 50 }, { productId: "d", gmv: 1 }, { productId: "z", gmv: 999 }], (id) => cat.get(id), 2)], ["Fitness Machines", "Pedometers"]);
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
