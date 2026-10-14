import type { ApiReply } from "../../integrations/tiktok-shop/api.ts";
import { listCampaignProductStats, listCampaignProducts, listCampaigns, listProductCreators, type Campaign, type CampaignProduct, type CampaignProductStats } from "../../integrations/tiktok-shop/partner.ts";
import { amount, goldenSellers, type StatRow } from "../tap/golden.ts";
import { smallImage } from "../tap/image.ts";
import { updateLevels } from "../levels/store.ts";
import { pruneActivity } from "../admin/admins.ts";
import { refreshVideos } from "../admin/videos.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { linkedCreators, syncCreatorOrders } from "../sales/orders.ts";
import { buildRankings } from "../rankings/store.ts";
import { getBestselling, getMarketplaceCreator, searchMarketplaceCreators, type BestsellingKind } from "../../integrations/tiktok-shop/seller.ts";
import { TT_LEVELS, bestSlot, mytDay, type PlannedTask } from "./plan.ts";
import { TAG_START, tagFilters, tagNext, tagTask, type TagState } from "../accounts/tags.ts";
import type { Sessions } from "./sessions.ts";
import { catalogSales, creatorsNeedingDetail, linkedUsername, upsertCreatorProducts, openTaskCount, rebuildTapCatalog, saveDetail, saveSnapshot, saveTags, snapshotItems, tagsDue, upsertCreators, type TaskRow } from "./store.ts";

/** TikTok's "too many requests" code, shared by the app's whole API group. */
export const RATE_LIMITED = 36009002;
/** TikTok's "Internal error. Retry later." */
export const INTERNAL_ERROR = 36009003;
/** Creator profiles fetched per day (about 1 a second, backing off on rate limits); the rest wait for the next day, best-seller creators first. */
export const DETAILS_PER_DAY = 5000;
/** Pages per marketplace search (20 creators each). TikTok stops at about 1,000 results anyway. */
export const MARKET_PAGES = 55;

export class ApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(`${code} ${message}`.slice(0, 300));
    this.code = code;
  }
}

function ok<T>(r: ApiReply<T>): T {
  if (r.code !== 0) throw new ApiError(r.code, r.message);
  return r.data ?? ({} as T);
}

/**
 * What a task did. `more` puts it back in the queue (next page, or more creators to fetch) after `waitMs`.
 * `followUps` are new tasks it found (one per TAP campaign).
 */
export type StepResult = { count: number; more?: boolean; cursor?: string | null; waitMs?: number; followUps?: PlannedTask[] };
type Ctx = { sessions: Sessions; deadline: number };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type BestParams = { kind: BestsellingKind; date: string; timeSlot: "1D" | "7D" | "30D"; currency: "LOCAL" | "USD"; authorType?: string; categoryId?: string };
type BestCreator = { rank?: number; open_id?: string; user_name?: string };
type MarketCreator = { creator_open_id?: string; username?: string };

/** A best-seller list TikTok hasn't published yet waits here; the Rankings build doesn't wait for it. */
export const WAITING = "waiting";
const QUARTER = 15 * 60_000;
/** TikTok's reply when the date is newer than its newest list ("date must be on or before 2026-10-12"). */
export const notPublished = (err: unknown) => err instanceof ApiError && /must be on or before/i.test(err.message);

async function best(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const p = t.params as BestParams;
  const s = await sessions.seller();
  let data: Record<string, unknown[] | undefined>;
  try {
    data = ok(await getBestselling(s.token, s.cipher, p.kind, p));
  } catch (err) {
    // Not published yet (TikTok's video lists come out later than the others): check again on the next quarter hour, so a
    // day's lists all come in together. The next day's plan closes anything still waiting.
    if (notPublished(err)) return { count: 0, more: true, cursor: WAITING, waitMs: QUARTER - (Date.now() % QUARTER) + 30_000 };
    throw err;
  }
  const items = data[p.kind] ?? [];
  await saveSnapshot(p.kind, bestSlot(p), p.date, items);
  if (p.kind === "creators")
    await upsertCreators(
      (items as BestCreator[])
        .filter((c) => c.open_id || c.user_name)
        .map((c) => ({ creator_key: c.open_id ?? `u:${c.user_name}`, open_id: c.open_id ?? null, username: c.user_name ?? null, best: c, best_rank: c.rank ?? null })),
    );
  // A list that came in late: rebuild that day's Rankings with it (once per kind of list).
  const followUps: PlannedTask[] = t.cursor === WAITING ? [{ key: `rankings|${p.date}|${p.kind}`, kind: "rankings", params: { day: p.date }, priority: 5 }] : [];
  return { count: items.length, followUps };
}

/** Every Techwide TAP campaign (all statuses), then one follow-up task per campaign for its approved products. */
async function tapCampaigns(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const s = await sessions.partner();
  const campaigns: Campaign[] = [];
  let pageToken: string | undefined;
  do {
    const data = ok(await listCampaigns(s.token, s.cipher, { status: "UNSPECIFIED", pageSize: 50, pageToken }));
    campaigns.push(...(data.campaigns ?? []));
    pageToken = data.next_page_token || undefined;
    if (pageToken) await wait(300);
  } while (pageToken);
  await saveSnapshot("tap_campaigns", "all", t.run_date, campaigns);
  const followUps: PlannedTask[] = campaigns.map((c) => ({ key: `tap_products|${c.id}`, kind: "tap_products", params: { campaign: c }, priority: 2 }));
  return { count: campaigns.length, followUps };
}

/**
 * One campaign's approved products, every page, saved with the campaign they belong to. Holds seller and partner rates.
 * Then the campaign's sales per product (for Golden Sellers); if TikTok refuses those, the products are still saved.
 */
async function tapProducts(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const c = (t.params as { campaign: Campaign }).campaign;
  const s = await sessions.partner();
  const rows: (CampaignProduct & Record<string, unknown>)[] = [];
  let pageToken: string | undefined;
  do {
    const data = ok(await listCampaignProducts(s.token, s.cipher, c.id, { reviewStatus: "APPROVED", pageSize: 50, pageToken }));
    for (const p of data.products ?? []) rows.push({ ...p, campaign_id: c.id, campaign_name: c.name, campaign_status: c.status, campaign_end_time: c.campaign_end_time });
    pageToken = data.next_page_token || undefined;
    if (pageToken) await wait(300);
  } while (pageToken);
  await saveSnapshot("tap_products", c.id, t.run_date, rows);

  const shopOf = new Map(rows.map((p) => [p.id, p.shop_name ?? ""]));
  const stats: StatRow[] = [];
  // Products somebody promotes: their creators are read next (tap_creators), for My TAP products.
  const promoted: CreatorTaskProduct[] = [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  try {
    pageToken = undefined;
    do {
      const data: { campaign_product_statistics?: CampaignProductStats[]; next_page_token?: string } = ok(await listCampaignProductStats(s.token, s.cipher, c.id, { pageSize: 50, pageToken }));
      for (const x of data.campaign_product_statistics ?? []) {
        const d = x.campaign_product_detail;
        const k = d?.indicator_data;
        if (d?.product_id) stats.push([d.product_id, shopOf.get(d.product_id) ?? "", amount(k?.estimated_amount), amount(k?.actual_amount), amount(k?.estimated_partner_commission), amount(k?.actual_partner_commission)]);
        const p = d?.product_id ? byId.get(d.product_id) : undefined;
        if (p && (x.promoted_creator_num ?? 0) > 0) promoted.push([p.id, p.name, p.shop_name ?? "", smallImage(p.main_image_url)]);
      }
      pageToken = data.next_page_token || undefined;
      if (pageToken) await wait(300);
    } while (pageToken);
    await saveSnapshot("tap_stats", c.id, t.run_date, stats);
  } catch (err) {
    if (err instanceof ApiError && err.code === RATE_LIMITED) throw err;
    console.error("[refresh] campaign sales", c.id, err instanceof Error ? err.message : err);
  }
  const followUps: PlannedTask[] = promoted.length ? [{ key: `tap_creators|${c.id}`, kind: "tap_creators", params: { campaignId: c.id, products: promoted }, priority: 4 }] : [];
  return { count: rows.length, followUps };
}

/** Creator levels: today's totals for every Rezekii creator, then each one's level. Waits until all TAP data is read. */
async function levels(t: TaskRow): Promise<StepResult> {
  for (const kind of ["tap_campaigns", "tap_products", "tap_creators"])
    if (await openTaskCount(t.run_date, kind)) return { count: 0, more: true, waitMs: 60_000 };
  return { count: await updateLevels(t.run_date) };
}

/** The Rankings page data from the day's best-seller lists. Waits until every list (and older missing day) is saved, except lists TikTok hasn't published yet. */
async function rankings(t: TaskRow, { deadline }: Ctx): Promise<StepResult> {
  if (await openTaskCount(t.run_date, "best", WAITING)) return { count: 0, more: true, waitMs: 60_000 };
  // The full build and its three saves take about 35 seconds: start it only at the beginning of a tick, so it isn't cut off.
  if (Date.now() > deadline - 40_000) return { count: 0, more: true, waitMs: 0 };
  const built = await buildRankings((t.params as { day: string }).day);
  return { count: built.creators["30D"].length };
}

/** Each linked creator's own affiliate orders, creator by creator, carrying on from `cursor` when time runs out. */
async function orders(t: TaskRow, { deadline }: Ctx): Promise<StepResult> {
  const ids = await linkedCreators();
  let count = 0;
  for (let i = t.cursor ? Number(t.cursor) : 0; i < ids.length; i++) {
    if (Date.now() > deadline - 8000) return { count, more: true, cursor: String(i) };
    const token = await approvedCreatorToken(ids[i]);
    if (!token) continue;
    try {
      count += await syncCreatorOrders(ids[i], token, deadline - 5000);
    } catch (err) {
      console.error("[orders]", ids[i], err instanceof Error ? err.message : err);
    }
  }
  return { count };
}

/** Video numbers for every connected TikTok account (admin Video stats), then trims the admin activity log to 90 days. */
async function videos(t: TaskRow, { deadline }: Ctx): Promise<StepResult> {
  const r = await refreshVideos(t.cursor ? Number(t.cursor) : 0, deadline - 8000);
  if (r.next !== null) return { count: r.count, more: true, cursor: String(r.next) };
  await pruneActivity();
  return { count: r.count };
}

/** [productId, name, shop, image] */
type CreatorTaskProduct = [string, string, string, string | null];

/**
 * Every creator promoting each of one campaign's products: sales through their links, video and LIVE counts, sample status.
 * Resumes where it stopped (product index and page) when the timer tick runs out.
 */
async function tapCreators(t: TaskRow, { sessions, deadline }: Ctx): Promise<StepResult> {
  const { campaignId, products } = t.params as { campaignId: string; products: CreatorTaskProduct[] };
  const s = await sessions.partner();
  let { i, token } = (t.cursor ? JSON.parse(t.cursor) : { i: 0 }) as { i: number; token?: string };
  let count = 0;
  while (i < products.length) {
    if (Date.now() > deadline - 8000) return { count, more: true, cursor: JSON.stringify({ i, token }) };
    const [productId, name, shop, image] = products[i];
    const data = ok(await listProductCreators(s.token, s.cipher, campaignId, productId, { pageSize: 50, pageToken: token }));
    const now = new Date().toISOString();
    const found = (data.promotion_creators ?? [])
      .filter((c) => c.creator?.user_name)
      .map((c) => ({
        campaign_id: campaignId, product_id: productId, username: c.creator.user_name!.toLowerCase(), nick_name: c.creator.nick_name ?? null,
        temp_id: c.creator.creator_temp_id, temp_id_at: now, affiliate_product_id: c.affiliate_product_id ?? null,
        paid: amount(c.paid_amount?.amount), videos: c.video_count ?? 0, lives: c.room_count ?? 0, sample_status: c.free_sample_status ?? null,
        commission: c.commission ? Number(c.commission) : null, product_name: name, shop, image, as_of: t.run_date, updated_at: now,
      }));
    if (found.length) await upsertCreatorProducts(found);
    count += found.length;
    token = data.next_page_token || undefined;
    if (!token) i++;
    await wait(300);
  }
  return { count };
}

/** Rebuilds the TAP Marketplace table, after every campaign's products are saved (waits while any are still running). */
async function tapCatalog(t: TaskRow): Promise<StepResult> {
  if (await openTaskCount(t.run_date, "tap_products")) return { count: 0, more: true, waitMs: 60_000 };
  if (await openTaskCount(t.run_date, "tap_campaigns")) return { count: 0, more: true, waitMs: 60_000 };
  const count = await rebuildTapCatalog();
  // Golden Sellers from today's campaign sales (kept from the last good day if sales could not be read).
  const stats = (await snapshotItems("tap_stats", t.run_date)) as StatRow[];
  if (stats.length) await saveSnapshot("tap_golden", "top3", t.run_date, goldenSellers(stats, await catalogSales()));
  return { count };
}

/** Full Creator Marketplace profiles for new creators, until the run's time is up or the daily cap is reached. */
async function details(t: TaskRow, { sessions, deadline }: Ctx): Promise<StepResult> {
  if (t.result_count >= DETAILS_PER_DAY) return { count: 0 };
  const s = await sessions.seller();
  const todo = await creatorsNeedingDetail(Math.min(60, DETAILS_PER_DAY - t.result_count));
  if (!todo.length) return { count: 0 };
  let count = 0;
  for (const c of todo) {
    if (Date.now() > deadline) break;
    const r = await getMarketplaceCreator(s.token, s.cipher, c.open_id);
    // Too many calls, or TikTok's own "internal error, retry later": try again in a minute, nothing saved.
    if (r.code === RATE_LIMITED || r.code === INTERNAL_ERROR) return { count, more: true, waitMs: 60_000 };
    // A creator TikTok won't show (left the marketplace, private) is marked so it isn't asked for again.
    await saveDetail(c.creator_key, r.code === 0 ? (r.data?.creator ?? null) : null, r.code === 0 ? null : `${r.code} ${r.message}`.slice(0, 200));
    count++;
    await wait(1000);
  }
  return { count, more: true, waitMs: 0 };
}

/** TikTok's GMV and units-sold ranges, used to split a search that hits its ~1,000-result limit. */
export const GMV_RANGES = ["GMV_RANGE_0_100", "GMV_RANGE_100_1000", "GMV_RANGE_1000_10000", "GMV_RANGE_10000_AND_ABOVE"];
export const UNITS_RANGES = ["UNITS_SOLD_RANGE_0_10", "UNITS_SOLD_RANGE_10_100", "UNITS_SOLD_RANGE_100_1000", "UNITS_SOLD_RANGE_1000_AND_ABOVE"];
/** `level`: TikTok's creator level, set for the month's level-split search (e.g. "Lv. 3"). */
type MarketParams = { min: number; max: number | null; gmv?: string; units?: string; level?: string };

/** The narrower searches for one that hit TikTok's limit: by GMV range first, then by units sold. */
export function marketSplits(p: MarketParams): PlannedTask[] {
  const band = `${p.level ? `lv${TT_LEVELS.indexOf(p.level)}|` : ""}${p.min}-${p.max ?? "up"}`;
  if (!p.gmv) return GMV_RANGES.map((gmv) => ({ key: `marketplace|${band}|${gmv}`, kind: "marketplace", params: { ...p, gmv }, priority: 6 }));
  if (!p.units) return UNITS_RANGES.map((units) => ({ key: `marketplace|${band}|${p.gmv}|${units}`, kind: "marketplace", params: { ...p, units }, priority: 6 }));
  return [];
}

/**
 * One page of a Creator Marketplace search: a follower band, narrowed by GMV range and units sold when needed. Its search
 * allows about 3 calls a minute and stops at about 1,000 results, so a search that reaches the limit splits into narrower ones.
 */
async function marketplace(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const p = t.params as MarketParams;
  const s = await sessions.seller();
  const range = { count_ge: p.min, ...(p.max === null ? {} : { count_le: p.max }) };
  const filters = {
    follower_demographics: { count_range: range }, ...(p.gmv ? { gmv_ranges: [p.gmv] } : {}), ...(p.units ? { units_sold_ranges: [p.units] } : {}),
    ...(p.level ? { advanced_filters: { creator_level: [p.level] } } : {}),
  };
  const data = ok(await searchMarketplaceCreators(s.token, s.cipher, filters, { pageSize: 20, pageToken: t.cursor ?? undefined }));
  const items = (data.creators ?? []) as MarketCreator[];
  const level = p.level ? { tt_level: TT_LEVELS.indexOf(p.level) } : {};
  await upsertCreators(
    items
      .filter((c) => c.creator_open_id || c.username)
      .map((c) => ({ creator_key: c.creator_open_id ?? `u:${c.username}`, open_id: c.creator_open_id ?? null, username: c.username ?? null, market: c, ...level })),
  );
  const next = data.next_page_token;
  const total = t.result_count + items.length;
  const more = !!next && items.length > 0 && total < MARKET_PAGES * 20;
  // Ended at TikTok's ~1,000-result limit (or ours): the slice has more creators than TikTok shows, so search narrower slices.
  const capped = !more && total >= 980;
  return { count: items.length, more, cursor: more ? next : null, waitMs: 20_000, followUps: capped ? marketSplits(p) : undefined };
}

/** How often a linked creator's agency status is checked again (owner, 14 Oct 2026); their TikTok level, on the 1st. */
export const AGENCY_DAYS = 14;

/**
 * A linked creator's agency status and TikTok level (modules/accounts/tags.ts): one marketplace search per run, about 20
 * seconds apart, carrying on from `cursor`. Without a creator, it queues one such task for every linked creator who is due.
 */
async function agency(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const userId = (t.params as { userId?: string }).userId;
  if (!userId) {
    const due = await tagsDue(AGENCY_DAYS, `${mytDay(Date.now()).slice(0, 7)}-01T00:00:00+08:00`);
    return { count: due.length, followUps: due.map((c) => tagTask(c.user_id)) };
  }
  const username = await linkedUsername(userId);
  if (!username) return { count: 0 };
  const state: TagState = t.cursor ? JSON.parse(t.cursor) : TAG_START;
  const s = await sessions.seller();
  const data = ok(await searchMarketplaceCreators(s.token, s.cipher, { keyword: username, ...tagFilters(state) }, { pageSize: 20 }));
  const r = tagNext(state, (data.creators ?? []).some((x) => x.username?.toLowerCase() === username.toLowerCase()));
  if (!r.done) return { count: 0, more: true, cursor: JSON.stringify(r.state), waitMs: 20_000 };
  await saveTags(userId, r.done.agency, r.done.level);
  return { count: 1 };
}

export const STEPS: Record<string, (t: TaskRow, ctx: Ctx) => Promise<StepResult>> = {
  best,
  tap_campaigns: tapCampaigns,
  tap_products: tapProducts,
  tap_catalog: tapCatalog,
  tap_creators: tapCreators,
  levels,
  rankings,
  videos,
  orders,
  details,
  marketplace,
  agency,
};
