import type { ApiReply } from "../../integrations/tiktok-shop/api.ts";
import { listCampaignProducts, listCampaigns, type Campaign } from "../../integrations/tiktok-shop/partner.ts";
import { getBestselling, getMarketplaceCreator, searchMarketplaceCreators, type BestsellingKind } from "../../integrations/tiktok-shop/seller.ts";
import { bestSlot, type PlannedTask } from "./plan.ts";
import type { Sessions } from "./sessions.ts";
import { creatorsNeedingDetail, saveDetail, saveSnapshot, upsertCreators, type TaskRow } from "./store.ts";

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

/** One campaign's approved products, every page, saved with the campaign they belong to. Holds seller and partner rates. */
async function tapProducts(t: TaskRow, { sessions }: Ctx): Promise<StepResult> {
  const c = (t.params as { campaign: Campaign }).campaign;
  const s = await sessions.partner();
  const rows: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const data = ok(await listCampaignProducts(s.token, s.cipher, c.id, { reviewStatus: "APPROVED", pageSize: 50, pageToken }));
    for (const p of data.products ?? []) rows.push({ ...p, campaign_id: c.id, campaign_name: c.name, campaign_status: c.status, campaign_end_time: c.campaign_end_time });
    pageToken = data.next_page_token || undefined;
    if (pageToken) await wait(300);
  } while (pageToken);
  await saveSnapshot("tap_products", c.id, t.run_date, rows);
  return { count: rows.length };
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
  details,
  marketplace,
};
