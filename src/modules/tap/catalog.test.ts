import { test } from "node:test";
import assert from "node:assert/strict";
import { browse, creatorRateFor, PAGE_SIZE, type TapProduct } from "./catalog.ts";
import { amount, goldenSellers } from "./golden.ts";
import { smallImage } from "./image.ts";
import { n, pct, perSale, priceText, pulled, rm, short } from "../../app/app/marketplace/format.ts";

const P = (id: string, o: Partial<TapProduct>): TapProduct => ({
  id, name: `Product ${id}`, shop: "Shop A", category: "Beauty", image: null, priceLo: 10, priceHi: 10, openRate: 500, silverRate: 600,
  sold: 0, soldToday: 0, samples: 0, stock: 100, campaigns: 1, campaignName: null, campaignEnd: null, variants: [], asOf: "2026-10-13", ...o,
});
const ALL = [
  P("1", { name: "Serum Glow", sold: 500, samples: 3, silverRate: 900 }),
  P("2", { name: "Track Pants", shop: "ELGINI", category: "Fashion", sold: 900, priceLo: 30.9 }),
  P("3", { name: "Plain Tee", shop: "ELGINI", category: "Fashion", sold: 100, samples: 5, priceLo: 16.9 }),
  P("4", { name: "Lip Tint", sold: 100, silverRate: 1200 }),
];

test("tap catalog: Bronze gets the open rate, Silver and Gold one point more, capped at the campaign total", () => {
  assert.equal(creatorRateFor("bronze", 500, 1000), 500);
  assert.equal(creatorRateFor("silver", 500, 1000), 600);
  assert.equal(creatorRateFor("gold", 500, 550), 550);
  assert.equal(creatorRateFor("silver", 500, null), 600);
});

test("tap marketplace: search, filters and counts work like the mockup", () => {
  const r = browse(ALL, {});
  assert.deepEqual(r.items.map((p) => p.id), ["2", "1", "3", "4"]); // best-selling, ties by sold
  assert.equal(r.sortLabel, "Best-selling");
  assert.deepEqual(r.cats, [["All", 4], ["Beauty", 2], ["Fashion", 2]]);
  assert.deepEqual(r.shops, [["Shop A", 2], ["ELGINI", 2]]);

  // Category counts follow the search, shop and samples filters; shop counts never change.
  const s = browse(ALL, { q: "elgini" });
  assert.equal(s.total, 2);
  assert.deepEqual(s.cats, [["All", 2], ["Fashion", 2]]);
  assert.equal(s.shops.length, 2);
  assert.deepEqual(browse(ALL, { only: true }).items.map((p) => p.id), ["1", "3"]);
  assert.deepEqual(browse(ALL, { cat: "Fashion", shop: "ELGINI" }).items.map((p) => p.id), ["2", "3"]);
  assert.equal(browse(ALL, { cat: "All" }).total, 4);
});

test("tap marketplace: sorts", () => {
  const ids = (sort: string) => browse(ALL, { sort }).items.map((p) => p.id);
  assert.deepEqual(ids("com-d"), ["4", "1", "2", "3"]);
  assert.deepEqual(ids("price-a"), ["1", "4", "3", "2"]);
  assert.deepEqual(ids("smp-d"), ["3", "1", "2", "4"]);
  assert.deepEqual(ids("sold-a"), ["3", "4", "1", "2"]);
  assert.deepEqual(ids("nonsense"), ids("sold-d"));
});

test("tap marketplace: 24 per page", () => {
  const many = Array.from({ length: 50 }, (_, i) => P(String(i + 1), { sold: 100 - i }));
  assert.equal(browse(many, { page: 1 }).items.length, PAGE_SIZE);
  assert.equal(browse(many, { page: 3 }).items.length, 2);
  assert.equal(browse(many, { page: 3 }).total, 50);
});

test("golden sellers: top 3 shops by campaign GMV that still have live products", () => {
  const stats: [string, string, number][] = [["a1", "Gone Shop", 9e6], ["e1", "ELGINI", 5e6], ["n1", "Northmarch", 4e5], ["g1", "GINTELL", 3e5], ["g2", "GINTELL", 2e5], ["x", "", 9e9], ["t1", "Tiny", 1]];
  const live = [
    { id: "e1", shop: "ELGINI", sold: 10 }, { id: "e2", shop: "ELGINI", sold: 30 }, { id: "e3", shop: "ELGINI", sold: 20 }, { id: "e4", shop: "ELGINI", sold: 5 },
    { id: "n1", shop: "Northmarch", sold: 7 }, { id: "g1", shop: "GINTELL", sold: 1 }, { id: "t1", shop: "Tiny", sold: 99 },
  ];
  const g = goldenSellers(stats, live);
  assert.deepEqual(g.map((x) => x.shop), ["ELGINI", "GINTELL", "Northmarch"]); // GINTELL 500k beats Northmarch 400k; Gone Shop has no live products
  assert.deepEqual(g[0], { shop: "ELGINI", initial: "E", count: 4, sold: 65, ids: ["e2", "e3", "e1"] });
  assert.equal(amount("30,537.03"), 30537.03);
  assert.equal(amount(undefined), 0);
});

test("tap marketplace: display formats", () => {
  assert.equal(pct(500), "5%");
  assert.equal(pct(650), "6.5%");
  assert.equal(pct(null), "—");
  assert.equal(rm(30.9), "RM30.90");
  assert.equal(rm(1234.5), "RM1235"); // as in the mockup
  assert.equal(priceText(30.9, 30.9), "RM30.90");
  assert.equal(priceText(10, 25), "RM10.00 – RM25.00");
  assert.equal(short(950), "950");
  assert.equal(short(12_400), "12.4k");
  assert.equal(short(2_000_000), "2.0M"); // as in the mockup
  assert.equal(n(2641), "2,641");
  assert.equal(pulled("2026-10-13"), "13 Oct 2026");
  assert.equal(perSale(30.9, 500), "RM1.55");
  assert.equal(perSale(null, 500), "—");
});

test("tap images: full-size TikTok photos become 300px WebP", () => {
  assert.equal(smallImage("https://p16.example/tos/abc~tplv-aphluv4xwc-origin-jpeg.jpeg?dr=1"), "https://p16.example/tos/abc~tplv-aphluv4xwc-resize-webp:300:300.webp?dr=1");
  assert.equal(smallImage("https://p16.example/already-small.webp"), "https://p16.example/already-small.webp");
  assert.equal(smallImage(undefined), null);
});

test("a free sample needs campaign samples and TikTok's live check; not checked yet keeps the campaign number", async () => {
  const { withSampleOffers } = await import("./catalog.ts");
  const p = (id: string, samples: number) => ({ id, samples }) as unknown as Parameters<typeof withSampleOffers>[0][number];
  // DESSINI casserole: 1 campaign sample but TikTok offers none. ELGINI: TikTok offers its own samples, none in the campaign.
  const out = withSampleOffers([p("dessini", 1), p("elgini", 0), p("swiss", 18), p("new", 50)], { dessini: 0, elgini: 1, swiss: 1 });
  assert.deepEqual(out.map((x) => [x.id, x.samples]), [["dessini", 0], ["elgini", 0], ["swiss", 1], ["new", 50]]);
});
