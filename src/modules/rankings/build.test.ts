import { test } from "node:test";
import assert from "node:assert/strict";
import { bestVideos, buildCreators, buildProducts, contacts, dayLabel, detailOf, findRow, nums, pairRm, type ProductMeta } from "./build.ts";

test("rankings: RM amounts come from TikTok's RM list, else US$ × that list's rate", () => {
  const U = [{ id: "a", gmv_range: "$10~$20" }, { id: "b", gmv_range: "$100~$200" }, { id: "c", gmv_range: "$1~$2" }];
  const L = [{ id: "a", gmv_range: "MYR40~MYR80" }, { id: "b", gmv_range: "MYR420~MYR840" }, { id: "z", gmv_range: "MYR5~MYR9" }];
  const p = pairRm(L, U, "id");
  assert.equal(p.rate, 4.1); // median of 4.0 and 4.2
  assert.deepEqual(p.rm.get("a"), [40, 80, 0]);
  assert.deepEqual(p.rm.get("c"), [4.1, 8.2, 1]);
  assert.equal(p.dropped, 1); // "z" is only in the RM list
  assert.deepEqual(nums("MYR1095968.89~MYR2237999.76"), [1095968.89, 2237999.76]);
});

test("rankings: creators = TikTok's 4 type lists first, then daily figures for creators past them", () => {
  const c = (open_id: string, user: string, usd: string) => ({ open_id, user_name: user, nick_name: user.toUpperCase(), followers_count: 10, likes_count: 1, gmv_range: usd });
  const lists = {
    ALL: { L: [], U: [c("1", "ana", "$100~$200"), c("2", "ben", "$50~$60")] },
    AFFILIATE: { L: [], U: [c("2", "ben", "$300~$400"), c("3", "cid", "$10~$20")] },
  };
  const daily = [
    { id: "2", grp: "ALL", lo: 9e9, hi: 9e9, conv: false, days: 3, meta: { user: "ben" } }, // already ranked: left out
    { id: "9", grp: "AFFILIATE", lo: 30, hi: 40, conv: true, days: 2, meta: { user: "zed", nick: "Zed", fol: 5, likes: 0 } },
  ];
  const r = buildCreators(lists, daily);
  assert.deepEqual(r.rows.map((x) => [x[0], x[1], x[8]]), [[1, "ben", 1], [2, "ana", 1], [3, "cid", 1], [4, "zed", 2]]);
  assert.equal(r.tier1, 3);
  assert.deepEqual(r.rows[3].slice(5), [30, 40, 1, 2, 2]);
  assert.equal(buildCreators(lists, null).rows.length, 3);
});

test("rankings: products by category, ranked overall, daily figures numbered from 101 in their category", () => {
  const pm: ProductMeta[] = [];
  const pidx = new Map<string, number>();
  const cats = { "601450": { L: [], U: [{ id: "p1", name: "Serum", shop_name: "S", rating: "4.86", rank: 1, gmv_range: "$10~$20", img: "u1" }] }, "700645": { L: [], U: [{ id: "p2", name: "Vit", shop_name: "V", rating: "4.5", rank: 1, gmv_range: "$30~$40" }] } };
  const daily = [{ id: "p3", grp: "601450", lo: 5, hi: 6, conv: false, days: 4, meta: { name: "Toner", shop: "S", rating: "4.1" } }];
  const r = buildProducts(cats, daily, pm, pidx);
  assert.deepEqual(r.rows.map((x) => pm[x[0]][0]), ["p2", "p1", "p3"]);
  assert.deepEqual(pm[pidx.get("p1")!], ["p1", "Serum", "S", 4.9, "601450", "u1"]);
  assert.deepEqual(r.rows[2].slice(4), [101, 2, 4]);
});

test("rankings: contacts from a TikTok bio", () => {
  assert.deepEqual(contacts("Collab: 012-345 6789 | hello@shop.my | IG: @ana.reviews."), { wa: "60123456789", em: "hello@shop.my", ig: "ana.reviews" });
  assert.equal(contacts("wa.me/60198765432 for orders").wa, "60198765432");
  assert.deepEqual(contacts("just vibes"), { wa: "", em: "", ig: "" });
});

test("rankings: a Creator Marketplace profile in the panel's shape", () => {
  const d = detailOf({
    avatar: { url: "https://cdn/a.webp" }, nickname: "Ana", gmv: { amount: "1000", currency: "USD" }, video_gmv: { amount: "750" }, live_gmv: { amount: "250" },
    gmv_range: { formatted_range: "RM1K-RM10K" }, units_sold: 725, category_ids: ["601450", "700645", "999999"],
    category_gmv_distribution: [{ category_id: "700645", value: "0.7" }, { category_id: "-1", value: "0.3" }],
    follower_gender: [{ key: "male", value: "0.55" }, { key: "female", value: "0.32" }], follower_age: [{ key: "18-24", value: "0.1" }, { key: "25-34", value: "0.32" }],
    follower_location: [{ key: "KUALA LUMPUR" }, { key: "OTHER" }, { key: "JOHOR" }], content_gmv_distribution: [{ content_type: "live_gmv", value: "0.25" }, { content_type: "video_gmv", value: "0.75" }],
    avg_commission_rate: "2095", ec_video_count: 273, ec_live_count: 0, brand_collaboration_count: 4, promoted_product_num: 21, bio_description: "DM 0123456789",
  }, 4);
  assert.deepEqual([d.x, d.xu, d.vg, d.lg, d.vs, d.com], [4000, 1000, 3000, 1000, 75, 2095]);
  assert.deepEqual(d.c, ["700645", "601450"]);
  assert.deepEqual([d.f, d.m, d.age, d.loc, d.wa], [32, 55, "25-34 · 32%", "Kuala Lumpur, Johor", "60123456789"]);
});

test("rankings: Find creators rows", () => {
  const r = findRow({ username: "ana", nickname: "Ana", follower_count: 1200, gmv: { amount: "1456.4" }, video_gmv: { amount: "1148.1" }, live_gmv: { amount: "308.3" }, avg_ec_video_view_count: 1410 }, 4);
  assert.deepEqual(r.slice(0, 7), ["@ana", "Ana", 1200, "RM5.8k", 79, "1.4k", true]);
  assert.equal(findRow({ username: "b", gmv_range: { formatted_range: "RM1K-RM10K", minimum_amount: "1000", maximum_amount: "10000" } }, 4)[3], "RM1K-RM10K");
});

test("rankings: best-selling video per creator, matched by an unambiguous display name", () => {
  const v = (id: string, nick: string, usd: string) => ({ id, nick_name: nick, gmv_range: usd, views: 10, publish_time: 1789570420, duration: 30 });
  const days = [
    { day: "2026-10-10", L: [], U: [v("v1", "Ana", "$1~$2"), v("v2", "Ana", "$5~$6"), v("v3", "Twin", "$9~$9")] },
    { day: "2026-10-11", L: [], U: [v("v1", "Ana", "$3~$4")] },
  ];
  const det = { ana: { nick: "Ana" }, t1: { nick: "Twin" }, t2: { nick: "Twin" } } as never;
  const r = bestVideos(days, det, []);
  assert.deepEqual(r.CBEST, { ana: "v2" }); // best day wins; "Twin" is two creators, so no match
  assert.equal(r.nDays, 2);
  assert.deepEqual(r.VID.v2[11], [[0, 20, 24]]); // US$5–6 × 4.08
  assert.equal(r.VID.v2[4], "16 Sep 2026");
  assert.equal(r.VID.v2[5], 25); // days from posting to the end of 11 Oct, the newest list day
  assert.equal(dayLabel(1789570420), "16 Sep");
});
