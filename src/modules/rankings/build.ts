/**
 * Rankings data, built once a day from TikTok's best-seller lists (the same rules as the approved mockup's builder):
 * Creators per period: TikTok's 4 creator-type lists (ALL, AFFILIATE, OFFICIAL, CHANNEL) come first, ranked by TikTok's GMV
 * range. For 7 and 30 days, creators who only appear in TikTok's daily lists follow, ranked by their daily figures added up.
 * Order comes from TikTok's US$ lists; amounts are RM: TikTok's own RM figure when present in both lists, otherwise
 * US$ × TikTok's rate for that list. Products: 28 level-1 categories × 100, ranked the same way (plus daily figures).
 * Pure: no network, no database.
 */
export const SLOTS = ["1D", "7D", "30D"] as const;
export type Slot = (typeof SLOTS)[number];
export const TYPES = ["ALL", "AFFILIATE", "OFFICIAL", "CHANNEL"] as const;

/** TikTok Shop Malaysia's level-1 product categories. */
export const CAT: Record<string, string> = {
  "600001": "Home Supplies", "600024": "Kitchenware", "600154": "Textiles & Soft Furnishings", "600942": "Household Appliances",
  "601152": "Womenswear", "601303": "Muslim Fashion", "601352": "Shoes", "601450": "Beauty & Personal Care",
  "601739": "Phones & Electronics", "601755": "Computers & Office", "602118": "Pet Supplies", "602284": "Baby & Maternity",
  "603014": "Sports & Outdoor", "604206": "Toys & Hobbies", "604453": "Furniture", "604579": "Tools & Hardware",
  "604968": "Home Improvement", "605196": "Automotive & Motorcycle", "605248": "Fashion Accessories", "700437": "Food & Beverages",
  "700645": "Health", "802184": "Kids' Fashion", "824328": "Menswear", "824584": "Luggage & Bags", "951432": "Collectibles",
  "953224": "Jewellery", "856720": "Pre-Owned", "801928": "Books & Media",
};

export type Raw = Record<string, unknown>;
/** The two numbers in TikTok's range text, e.g. "MYR1095968.89~MYR2237999.76" or "$93.20~$146.30". */
export const nums = (s: unknown) => (String(s ?? "").match(/[\d.]+/g) ?? []).map(Number).filter((v) => !Number.isNaN(v));
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** RM amounts for one list pair (L = RM list, U = US$ list): {id: [lo, hi, converted]}, TikTok's rate, and RM-only entries left out. */
export function pairRm(L: Raw[], U: Raw[], key: string): { rm: Map<string, [number, number, 0 | 1]>; rate: number; dropped: number } {
  const lm = new Map(L.map((x) => [String(x[key]), x]));
  const ratios: number[] = [];
  for (const x of U) {
    const l = lm.get(String(x[key]));
    const u = nums(x.gmv_range)[0];
    if (l && u) ratios.push(nums(l.gmv_range)[0] / u);
  }
  const rate = ratios.length ? median(ratios) : 4.08;
  const rm = new Map<string, [number, number, 0 | 1]>();
  for (const x of U) {
    const l = lm.get(String(x[key]));
    if (l) {
      const a = nums(l.gmv_range);
      rm.set(String(x[key]), [a[0] ?? 0, a[1] ?? 0, 0]);
    } else {
      const a = nums(x.gmv_range);
      rm.set(String(x[key]), [(a[0] ?? 0) * rate, (a[1] ?? 0) * rate, 1]);
    }
  }
  const uk = new Set(U.map((x) => String(x[key])));
  return { rm, rate, dropped: L.filter((x) => !uk.has(String(x[key]))).length };
}

/** A daily-figures row from the database: an id with its RM sums over the days it was in a daily top 100. */
export type DailySum = { id: string; grp: string; lo: number; hi: number; conv: boolean; days: number; meta: Raw | null };

/** [rank, username, nickname, followers, likes, lo, hi, converted, tier (1 = TikTok's period list, 2 = daily figures), days] */
export type CreatorRow = [number, string, string, number, number, number, number, 0 | 1, 1 | 2, number];

/** Creators for one period. `lists[type] = { L, U }` are TikTok's RM and US$ lists; `daily` = daily sums (7 and 30 days). */
export function buildCreators(lists: Record<string, { L: Raw[]; U: Raw[] }>, daily: DailySum[] | null) {
  const tier1 = new Map<string, [number, number, 0 | 1]>();
  const info = new Map<string, { user: string; nick: string; fol: number; likes: number }>();
  let rate = 4.08, dropped = 0;
  for (const t of TYPES) {
    const { L, U } = lists[t] ?? { L: [], U: [] };
    const p = pairRm(L, U, "open_id");
    dropped += p.dropped;
    if (t === "ALL") rate = p.rate;
    for (const x of U) {
      const id = String(x.open_id);
      const v = p.rm.get(id)!;
      if (!tier1.has(id) || v[1] > tier1.get(id)![1]) tier1.set(id, v);
      info.set(id, { user: String(x.user_name ?? ""), nick: String(x.nick_name ?? ""), fol: Number(x.followers_count) || 0, likes: Number(x.likes_count) || 0 });
    }
  }
  const rows: CreatorRow[] = [...tier1.entries()]
    .sort((a, b) => b[1][0] + b[1][1] - (a[1][0] + a[1][1]))
    .map(([id, v]) => { const i = info.get(id)!; return [0, i.user, i.nick, i.fol, i.likes, Math.round(v[0]), Math.round(v[1]), v[2], 1, 0]; });
  const tier1Count = rows.length;
  if (daily)
    rows.push(
      ...daily
        .filter((d) => !tier1.has(d.id) && d.meta?.user)
        .sort((a, b) => b.lo + b.hi - (a.lo + a.hi))
        .map((d): CreatorRow => [0, String(d.meta!.user), String(d.meta!.nick ?? ""), Number(d.meta!.fol) || 0, Number(d.meta!.likes) || 0, Math.round(d.lo), Math.round(d.hi), d.conv ? 1 : 0, 2, d.days]),
    );
  rows.forEach((r, k) => (r[0] = k + 1));
  return { rows, rate, dropped, tier1: tier1Count };
}

/** [id, name, shop, rating, category, photo] */
export type ProductMeta = [string, string, string, number, string, string | null];
/** [product index, lo, hi, converted, rank in category, tier, days] */
export type ProductRow = [number, number, number, 0 | 1, number, 1 | 2, number];

/** Products for one period from TikTok's 28 category lists (+ daily figures for 7 and 30 days). `pm`/`pidx` are shared across periods. */
export function buildProducts(cats: Record<string, { L: Raw[]; U: Raw[] }>, daily: DailySum[] | null, pm: ProductMeta[], pidx: Map<string, number>) {
  const rows: ProductRow[] = [];
  const rates: number[] = [];
  let dropped = 0;
  const add = (id: string, name: unknown, shop: unknown, rating: unknown, cat: string, img: unknown) => {
    if (!pidx.has(id)) {
      pidx.set(id, pm.length);
      pm.push([id, String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 80), String(shop ?? ""), Math.round(Number(rating || 0) * 10) / 10, cat, img ? String(img) : null]);
    }
    return pidx.get(id)!;
  };
  for (const cat of Object.keys(CAT)) {
    const { L, U } = cats[cat] ?? { L: [], U: [] };
    if (!U.length) continue;
    const p = pairRm(L, U, "id");
    dropped += p.dropped;
    rates.push(p.rate);
    for (const x of U) {
      const v = p.rm.get(String(x.id))!;
      rows.push([add(String(x.id), x.name, x.shop_name, x.rating, cat, x.img), Math.round(v[0]), Math.round(v[1]), v[2], Number(x.rank) || 0, 1, 0]);
    }
  }
  rows.sort((a, b) => b[1] + b[2] - (a[1] + a[2]));
  if (daily) {
    const tier1 = new Set(rows.map((r) => r[0]));
    const crank: Record<string, number> = {};
    for (const d of [...daily].sort((a, b) => b.lo + b.hi - (a.lo + a.hi))) {
      const m = d.meta ?? {};
      const pi = add(d.id, m.name, m.shop, m.rating, d.grp, m.img);
      if (tier1.has(pi)) continue;
      crank[d.grp] = (crank[d.grp] ?? 100) + 1;
      rows.push([pi, Math.round(d.lo), Math.round(d.hi), d.conv ? 1 : 0, crank[d.grp], 2, d.days]);
    }
  }
  return { rows, rate: rates.length ? median(rates) : 4.08, dropped };
}

const MYT = 8 * 3600_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "11 Oct" in Malaysia time, from unix seconds. */
export const dayLabel = (unix: number) => { const d = new Date(unix * 1000 + MYT); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

/** [rank, id, nickname, seconds, views, likes, comments, shares, lo, hi, posted, products, converted] */
export type VideoRow = [number, string, string, number, number, number, number, number, number, number, string, string[], 0 | 1];
export function buildVideos(L: Raw[], U: Raw[]) {
  const p = pairRm(L, U, "id");
  const rows: VideoRow[] = U.map((v) => {
    const [lo, hi, cv] = p.rm.get(String(v.id))!;
    const prods = ((v.product_infos as Raw[] | undefined) ?? []).map((x) => String(x.product_name ?? "").replace(/\s+/g, " ").trim().slice(0, 70)).slice(0, 2);
    return [Number(v.rank) || 0, String(v.id), String(v.nick_name ?? ""), Number(v.duration) || 0, Number(v.views) || 0, Number(v.likes) || 0, Number(v.comments) || 0, Number(v.shares) || 0, Math.round(lo), Math.round(hi), dayLabel(Number(v.publish_time) || 0), prods, cv];
  });
  return { rows, rate: p.rate, dropped: p.dropped };
}

/** [rank, username, nickname, title, seconds, started, lo, hi, avatar, converted] */
export type LiveRow = [number, string, string, string, number, string, number, number, string | null, 0 | 1];
export function buildLives(L: Raw[], U: Raw[], avatar: (user: string) => string | null) {
  const p = pairRm(L, U, "id");
  const rows: LiveRow[] = U.map((l) => {
    const [lo, hi, cv] = p.rm.get(String(l.id))!;
    const user = String(l.creator_name ?? "");
    return [Number(l.rank) || 0, user, String(l.creator_nick_name ?? ""), String(l.title ?? "").replace(/\s+/g, " ").trim().slice(0, 70), Number(l.duration) || 0, dayLabel(Number(l.start_time) || 0), Math.round(lo), Math.round(hi), avatar(user), cv];
  });
  return { rows, rate: p.rate, dropped: p.dropped };
}

/** WhatsApp number (60…), email and Instagram handle found in a TikTok bio. */
export function contacts(bio: string): { wa: string; em: string; ig: string } {
  let wa = "";
  const link = bio.match(/wa\.me\/(\d{9,13})/);
  if (link) wa = link[1];
  else {
    const m = bio.match(/(?<!\d)(\+?60|0)(1\d)[\s-]?(\d{3,4})[\s-]?(\d{4})(?!\d)/);
    if (m) wa = `60${m[2]}${m[3]}${m[4]}`;
  }
  const em = bio.match(/[\w.+-]+@[\w-]+\.[A-Za-z.]{2,}/)?.[0] ?? "";
  const ig = bio.match(/(?:\big|\binsta(?:gram)?)\s*[:：@-]+\s*@?([A-Za-z0-9._]{3,30})/i)?.[1]?.replace(/\.$/, "") ?? "";
  return { wa, em, ig };
}

/** A creator's TikTok Creator Marketplace profile, in the shape the panel shows. Amounts in RM at the 30-day rate. */
export type Detail = {
  a: string | null; x: number; xu: number; band: string; vg: number; lg: number; u: number; c: string[]; bio: string; wa: string; em: string; ig: string;
  com: number; ev: number; el: number; f: number; m: number; age: string; loc: string; br: number; pr: number; vs: number; nick: string;
};
const amt = (v: unknown) => Number((v as { amount?: string } | undefined)?.amount) || 0;
const share = (list: unknown, key: string) => Math.round(Number(((list as { key: string; value: string }[] | undefined) ?? []).find((x) => x.key === key)?.value ?? 0) * 100);
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function detailOf(d: Raw, rate30: number): Detail {
  const bio = String(d.bio_description ?? "");
  const shares = ((d.category_gmv_distribution as { category_id: string; value: string }[] | undefined) ?? [])
    .filter((c) => c.category_id !== "-1")
    .sort((a, b) => Number(b.value) - Number(a.value))
    .map((c) => c.category_id);
  const cats = [...shares, ...((d.category_ids as string[] | undefined) ?? []).filter((c) => !shares.includes(c))].filter((c) => CAT[c]).slice(0, 3);
  const ages = [...((d.follower_age as { key: string; value: string }[] | undefined) ?? [])].sort((a, b) => Number(b.value) - Number(a.value));
  const content = ((d.content_gmv_distribution as { content_type: string; value: string }[] | undefined) ?? []).reduce<Record<string, number>>((o, c) => ({ ...o, [c.content_type]: Number(c.value) }), {});
  const total = Object.values(content).reduce((a, b) => a + b, 0);
  const xu = amt(d.gmv);
  return {
    a: ((d.avatar as { url?: string } | undefined)?.url) ?? null,
    x: Math.round(xu * rate30), xu: Math.round(xu), band: String((d.gmv_range as { formatted_range?: string } | undefined)?.formatted_range ?? ""),
    vg: Math.round(amt(d.video_gmv) * rate30), lg: Math.round(amt(d.live_gmv) * rate30), u: Number(d.units_sold) || 0, c: cats,
    bio: bio.replace(/\s+/g, " ").trim().slice(0, 160), ...contacts(bio),
    com: Number(d.avg_commission_rate) || 0, ev: Number(d.ec_video_count) || 0, el: Number(d.ec_live_count) || 0,
    f: share(d.follower_gender, "female"), m: share(d.follower_gender, "male"),
    age: ages[0] ? `${ages[0].key} · ${Math.round(Number(ages[0].value) * 100)}%` : "",
    loc: ((d.follower_location as { key: string }[] | undefined) ?? []).filter((l) => l.key !== "OTHER").slice(0, 3).map((l) => titleCase(l.key)).join(", "),
    br: Number(d.brand_collaboration_count) || 0, pr: Number(d.promoted_product_num) || 0,
    vs: total ? Math.round(((content.video_gmv ?? 0) / total) * 100) : -1, nick: String(d.nickname ?? ""),
  };
}

/** [username, nickname, followers, GMV text, video share % (-1 unknown), avg video views text, exact GMV shared, avatar, GMV US$ for sorting] */
export type FindRow = [string, string, number, string, number, string, boolean, string | null, number];
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(Math.round(v)));
export function findRow(m: Raw, rate30: number): FindRow {
  const xu = amt(m.gmv), vu = amt(m.video_gmv), lu = amt(m.live_gmv);
  const range = m.gmv_range as { formatted_range?: string; minimum_amount?: string; maximum_amount?: string } | undefined;
  return [
    `@${String(m.username ?? "?")}`, String(m.nickname ?? ""), Number(m.follower_count) || 0,
    xu ? `RM${short(xu * rate30)}` : (range?.formatted_range ?? "–"), vu + lu ? Math.round((vu / (vu + lu)) * 100) : -1,
    short(Number(m.avg_ec_video_view_count) || 0), !!xu, ((m.avatar as { url?: string } | undefined)?.url) ?? null,
    xu || (Number(range?.minimum_amount) + Number(range?.maximum_amount)) / 2 || 0,
  ];
}

/** One day's US$ and RM daily video lists, for a creator's best-selling video and its daily figures. */
export type VideoDay = { day: string; L: Raw[]; U: Raw[] };
/** [views, likes, comments, shares, posted, age in days, seconds, products, 30-day lo, 30-day hi, days in daily top 100, [[day index, lo, hi]]] */
export type BestVideo = [number, number, number, number, string, number, number, string[], number, number, number, [number, number, number][]];

/**
 * Each creator's best-selling video: matched by display name (only when exactly one creator has that name), scored by its
 * 30-day figure, else its best day. Returns the videos and which creator each belongs to.
 */
export function bestVideos(days: VideoDay[], details: Record<string, Detail>, top30: VideoRow[]) {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const series = new Map<string, [number, number, number][]>();
  const meta = new Map<string, Raw>();
  sorted.forEach((d, di) => {
    const p = pairRm(d.L, d.U, "id");
    for (const x of d.U) {
      const [lo, hi] = p.rm.get(String(x.id))!;
      series.set(String(x.id), [...(series.get(String(x.id)) ?? []), [di, Math.round(lo), Math.round(hi)]]);
      meta.set(String(x.id), x);
    }
  });
  const byNick = new Map<string, string[]>();
  for (const [u, d] of Object.entries(details)) if (d.nick) byNick.set(d.nick, [...(byNick.get(d.nick) ?? []), u]);
  const v30 = new Map(top30.map((r) => [r[1], r]));
  const best = new Map<string, { id: string; score: [number, number] }>();
  for (const [id, x] of meta) {
    const users = byNick.get(String(x.nick_name ?? "")) ?? [];
    if (users.length !== 1) continue;
    const r30 = v30.get(id);
    const score: [number, number] = r30 ? [1, r30[9]] : [0, Math.max(...series.get(id)!.map((s) => s[2]))];
    const cur = best.get(users[0]);
    if (!cur || score[0] > cur.score[0] || (score[0] === cur.score[0] && score[1] > cur.score[1])) best.set(users[0], { id, score });
  }
  const VID: Record<string, BestVideo> = {};
  const CBEST: Record<string, string> = {};
  // Age is counted to the end of the newest data day (Malaysia time).
  const ref = sorted.length ? Date.parse(`${sorted.at(-1)!.day}T23:59:00+08:00`) : Date.now();
  for (const [u, { id }] of best) {
    const x = meta.get(id)!;
    const r30 = v30.get(id);
    const prods = ((x.product_infos as Raw[] | undefined) ?? []).map((q) => String(q.product_name ?? "").replace(/\s+/g, " ").trim().slice(0, 70)).slice(0, 2);
    const pt = Number(x.publish_time) || 0;
    const posted = new Date(pt * 1000 + MYT);
    VID[id] = [Number(x.views) || 0, Number(x.likes) || 0, Number(x.comments) || 0, Number(x.shares) || 0, `${dayLabel(pt)} ${posted.getUTCFullYear()}`, Math.max(0, Math.floor((ref - pt * 1000) / 86_400_000)), Number(x.duration) || 0, prods, r30 ? r30[8] : 0, r30 ? r30[9] : 0, series.get(id)!.length, series.get(id)!];
    CBEST[u] = id;
  }
  return { VID, CBEST, nDays: sorted.length, first: sorted[0]?.day ?? null, last: sorted.at(-1)?.day ?? null };
}
