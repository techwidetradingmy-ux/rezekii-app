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
import { bestSlot, type PlannedTask } from "./plan.ts";
import type { Sessions } from "./sessions.ts";
import { catalogSales, creatorsNeedingDetail, upsertCreatorProducts, openTaskCount, rebuildTapCatalog, saveDetail, saveSnapshot, snapshotItems, upsertCreators, type TaskRow } from "./store.ts";

/** TikTok's "too many requests" code, shared by the app's whole API group. */
export const RATE_LIMITED = 36009002;
/** New creator profiles fetched per day; the rest wait for the next day, best-seller creators first. */
export const DETAILS_PER_DAY = 1500;
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

async function best(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const p = t.params as BestParams;
  const s = await sessions.seller();
  const data = ok(await getBestselling(s.token, s.cipher, p.kind, p));
  const items = data[p.kind] ?? [];
  await saveSnapshot(p.kind, bestSlot(p), p.date, items);
  if (p.kind === "creators")
    await upsertCreators(
      (items as BestCreator[])
        .filter((c) => c.open_id || c.user_name)
        .map((c) => ({ creator_key: c.open_id ?? `u:${c.user_name}`, open_id: c.open_id ?? null, username: c.user_name ?? null, best: c, best_rank: c.rank ?? null })),
    );
  return { count: items.length };
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

/** The Rankings page data from the day's best-seller lists. Waits until every list (and older missing day) is saved. */
async function rankings(t: TaskRow): Promise<StepResult> {
  if (await openTaskCount(t.run_date, "best")) return { count: 0, more: true, waitMs: 60_000 };
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
    if (r.code === RATE_LIMITED) return { count, more: true, waitMs: 60_000 };
    // A creator TikTok won't show (left the marketplace, private) is marked so it isn't asked for again.
    await saveDetail(c.creator_key, r.code === 0 ? (r.data?.creator ?? null) : null, r.code === 0 ? null : `${r.code} ${r.message}`.slice(0, 200));
    count++;
    await wait(1000);
  }
  return { count, more: true, waitMs: 0 };
}

/** One page of a Creator Marketplace search for one follower band. Its search allows about 3 calls a minute. */
async function marketplace(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const { min, max } = t.params as { min: number; max: number | null };
  const s = await sessions.seller();
  const range = { count_ge: min, ...(max === null ? {} : { count_le: max }) };
  const data = ok(await searchMarketplaceCreators(s.token, s.cipher, { follower_demographics: { count_range: range } }, { pageSize: 20, pageToken: t.cursor ?? undefined }));
  const items = (data.creators ?? []) as MarketCreator[];
  await upsertCreators(
    items
      .filter((c) => c.creator_open_id || c.username)
      .map((c) => ({ creator_key: c.creator_open_id ?? `u:${c.username}`, open_id: c.creator_open_id ?? null, username: c.username ?? null, market: c })),
  );
  const next = data.next_page_token;
  const more = !!next && items.length > 0 && t.result_count + items.length < MARKET_PAGES * 20;
  return { count: items.length, more, cursor: more ? next : null, waitMs: 20_000 };
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
};
