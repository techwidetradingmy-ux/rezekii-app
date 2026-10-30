import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listCampaignProducts, listCampaigns, reviewCampaignProduct, type Campaign, type CampaignProduct, type RejectReason } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { logActivity } from "./admins.ts";
import { smallImage } from "../tap/image.ts";
import { unixSeconds } from "../tap/stages.ts";
import type { StatRow } from "../tap/golden.ts";

export type AdminCampaign = {
  id: string;
  name: string;
  /** draft = created, not published (hidden from shops) */
  status: "draft" | "live" | "upcoming" | "ended";
  /** A draft hidden from the TAP list in Rezekii (TikTok can't delete campaigns). */
  hidden?: boolean;
  start: number | null;
  end: number | null;
  products: number;
  creators: number;
  /** highest total rate ×100 */
  upto: number;
  /** RM, from the campaign's sales figures (partner commission is Techwide's share) */
  gmvPaid: number;
  gmvSettled: number;
  comEst: number;
  comSettled: number;
};
export type AdminTapProduct = {
  id: string;
  name: string;
  shop: string | null;
  image: string | null;
  open: number | null;
  total: number | null;
  sold: number;
  stock: number | null;
  samples: number;
  available: boolean;
  variants: [string, number | null, number][];
};

type Raw = CampaignProduct & { sku_information_list?: { sku_name?: string; properties?: { value_name?: string }[]; base_price?: { sale_price?: string }; inventory?: { available_quantity?: number } }[] };

async function latest(dataset: string): Promise<{ asOf: string | null; rows: { slot: string; items: unknown[] }[] }> {
  const [d] = (await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&select=as_of&order=as_of.desc&limit=1`)).json()) as { as_of: string }[];
  if (!d) return { asOf: null, rows: [] };
  return { asOf: d.as_of, rows: await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&as_of=eq.${d.as_of}&select=slot,items`)).json() };
}

const statusOf = (c: Campaign): AdminCampaign["status"] => (c.status === "ONGOING" ? "live" : c.status === "CLOSED" ? "ended" : c.status === "READY" ? "draft" : "upcoming");

/** Campaign product lists already read, kept 5 minutes (they change only with the daily refresh). */
const productLists = new Map<string, { at: number; rows: AdminTapProduct[]; asOf: string }>();

/** One campaign's products from the latest daily refresh (admin TAP page, loaded when the campaign is picked). */
export async function campaignProducts(campaignId: string): Promise<AdminTapProduct[]> {
  const hit = productLists.get(campaignId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return withApproved(campaignId, hit.asOf, hit.rows);
  const [d] = (await (await supabaseRest("market_snapshots?dataset=eq.tap_products&select=as_of&order=as_of.desc&limit=1")).json()) as { as_of: string }[];
  if (!d) return [];
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_products&as_of=eq.${d.as_of}&slot=eq.${encodeURIComponent(campaignId)}&select=items&limit=1`)).json()) as { items: Raw[] }[];
  const rows = (row?.items ?? []).map(toAdminProduct).sort((a, b) => b.sold - a.sold);
  productLists.set(campaignId, { at: Date.now(), rows, asOf: d.as_of });
  return withApproved(campaignId, d.as_of, rows);
}

/** Products approved on Rezekii since the refresh (they join the campaign's list with the next daily refresh), first. */
async function withApproved(campaignId: string, asOf: string, rows: AdminTapProduct[]): Promise<AdminTapProduct[]> {
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_approved&slot=eq.${encodeURIComponent(campaignId)}&as_of=gte.${asOf}&select=items&order=as_of.desc&limit=1`)).json()) as { items: AdminTapProduct[] }[];
  const have = new Set(rows.map((p) => p.id));
  return [...(row?.items ?? []).filter((p) => !have.has(p.id)), ...rows];
}

const mytToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/** Remembers a product approved on Rezekii, so the campaign's list shows it before the next daily refresh. */
async function keepApproved(campaignId: string, item: AdminTapProduct): Promise<void> {
  const today = mytToday();
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_approved&slot=eq.${encodeURIComponent(campaignId)}&as_of=eq.${today}&select=items&limit=1`)).json()) as { items: AdminTapProduct[] }[];
  const items = [item, ...(row?.items ?? []).filter((p) => p.id !== item.id)];
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ dataset: "tap_approved", slot: campaignId, as_of: today, items, fetched_at: new Date().toISOString() }),
  });
}

const toAdminProduct = (p: Raw): AdminTapProduct => ({
  id: p.id, name: (p.name ?? "").replace(/\s+/g, " ").trim(), shop: p.shop_name ?? null, image: p.main_image_url ? smallImage(p.main_image_url) : null,
  open: p.open_collaboration_commission_rate ?? null, total: p.total_commission_rate ?? null, sold: Number(p.product_sales ?? 0), stock: p.inventory ?? null,
  samples: p.sample_quota ?? 0, available: p.is_available !== false,
  variants: (p.sku_information_list ?? []).slice(0, 8).map((s): [string, number | null, number] => [
    (s.properties ?? []).map((x) => x.value_name).filter(Boolean).join(" / ") || s.sku_name || "Default",
    s.base_price?.sale_price ? Number(s.base_price.sale_price) : null,
    s.inventory?.available_quantity ?? 0,
  ]),
});

/** One campaign's product count and highest total commission rate, saved by the daily refresh for the admin TAP page. */
export const productSums = (rows: { total_commission_rate?: number | null }[]): [number, number] => [rows.length, Math.max(0, ...rows.map((p) => Number(p.total_commission_rate ?? 0)))];

/** Each campaign's product totals for the newest refresh; worked out from the full product lists (and saved) when missing. */
async function campaignSums(): Promise<{ asOf: string | null; by: Map<string, [number, number]> }> {
  const [sums, [d]] = await Promise.all([
    latest("tap_product_sums"),
    supabaseRest("market_snapshots?dataset=eq.tap_products&select=as_of&order=as_of.desc&limit=1").then((r) => r.json() as Promise<{ as_of: string }[]>),
  ]);
  if (!d || sums.asOf === d.as_of) return { asOf: sums.asOf, by: new Map(sums.rows.map((r) => [r.slot, r.items as [number, number]])) };
  const prods = await latest("tap_products");
  const by = new Map(prods.rows.map((r) => [r.slot, productSums(r.items as Raw[])]));
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([...by].map(([slot, items]) => ({ dataset: "tap_product_sums", slot, as_of: prods.asOf, items, fetched_at: new Date().toISOString() }))),
  }).catch(() => undefined);
  return { asOf: prods.asOf, by };
}

/** Every campaign's creators, 1,000 rows a request (the database's most per request), all pages at once. */
async function creatorRows(): Promise<{ campaign_id: string; username: string }[]> {
  const base = "tap_creator_products?select=campaign_id,username&order=campaign_id,product_id,username";
  const head = await supabaseRest(`${base}&limit=1`, { headers: { prefer: "count=exact" } });
  const total = Number(head.headers.get("content-range")?.split("/")[1] ?? 0);
  const pages = await Promise.all(Array.from({ length: Math.ceil(total / 1000) }, (_, i) => supabaseRest(`${base}&offset=${i * 1000}&limit=1000`).then((r) => r.json() as Promise<{ campaign_id: string; username: string }[]>)));
  return pages.flat();
}

/** The refreshed campaign figures change only with the daily refresh: kept 5 minutes. */
let overview: { at: number; data: { asOf: string | null; campaigns: AdminCampaign[] } } | null = null;

/**
 * Techwide's TAP campaigns, each with its product and creator counts and commission. Admin only. The figures come from the
 * latest daily refresh; TikTok's newest campaigns are read live each time (one call, drafts first), so a campaign just created
 * or published shows at once (owner, 16 Oct 2026: a new draft couldn't be seen to publish it).
 */
export async function tapOverview(): Promise<{ asOf: string | null; campaigns: AdminCampaign[] }> {
  const [saved, live, hidden] = await Promise.all([refreshedCampaigns(), newestCampaigns(), hiddenDrafts().catch(() => new Set<string>())]);
  const known = new Map(saved.campaigns.map((c) => [c.id, c]));
  const fresh = new Map(live.map((c) => [c.id, c]));
  const added = live.filter((c) => !known.has(c.id)).map((c): AdminCampaign => ({
    id: c.id, name: c.name, status: statusOf(c), start: unixSeconds(c.campaign_start_time) || null, end: unixSeconds(c.campaign_end_time) || null,
    products: 0, creators: 0, upto: 0, gmvPaid: 0, gmvSettled: 0, comEst: 0, comSettled: 0,
  }));
  const updated = saved.campaigns.map((c) => {
    const l = fresh.get(c.id);
    return l ? { ...c, name: l.name, status: statusOf(l), start: unixSeconds(l.campaign_start_time) || c.start, end: unixSeconds(l.campaign_end_time) || c.end } : c;
  });
  const campaigns = [...added, ...updated].map((c) => (hidden.has(c.id) && c.status === "draft" ? { ...c, hidden: true } : c));
  return { asOf: saved.asOf, campaigns: campaigns.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.products - a.products) };
}

/**
 * Drafts an admin hid from the TAP list (owner, 16 Oct 2026): TikTok has no way to delete a campaign, so test drafts stay in
 * TikTok; Rezekii only leaves them out of its list (one shared list, kept in market_snapshots).
 */
const HIDDEN = "market_snapshots?dataset=eq.tap_hidden&slot=eq.drafts&as_of=eq.2000-01-01";
async function hiddenDrafts(): Promise<Set<string>> {
  const [row] = (await (await supabaseRest(`${HIDDEN}&select=items&limit=1`)).json()) as { items: string[] }[];
  return new Set(row?.items ?? []);
}

export async function setDraftHidden(campaignId: string, hide: boolean, actor: string): Promise<void> {
  const ids = await hiddenDrafts();
  if (hide) ids.add(campaignId);
  else ids.delete(campaignId);
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ dataset: "tap_hidden", slot: "drafts", as_of: "2000-01-01", items: [...ids], fetched_at: new Date().toISOString() }),
  });
  await logActivity(actor, "TAP", `${hide ? "hid" : "showed again"} a draft TAP campaign (${campaignId}) in Rezekii's list`);
}

/** Drafts, then published campaigns not started yet (a campaign just published lands here), then live, then ended. */
export const ORDER: Record<AdminCampaign["status"], number> = { draft: 0, upcoming: 1, live: 2, ended: 3 };

/** TikTok's 20 newest campaigns (drafts first), read live; none when TikTok doesn't answer. */
async function newestCampaigns(): Promise<Campaign[]> {
  const s = await storedSessions().partner().catch(() => null);
  if (!s) return [];
  const r = await listCampaigns(s.token, s.cipher, { pageSize: 20 }).catch(() => null);
  return r?.code === 0 ? (r.data?.campaigns ?? []).filter((c) => c?.id) : [];
}

async function refreshedCampaigns(): Promise<{ asOf: string | null; campaigns: AdminCampaign[] }> {
  if (overview && Date.now() - overview.at < 5 * 60_000) return overview.data;
  const [camps, sums, stats, creators] = await Promise.all([
    latest("tap_campaigns"),
    campaignSums(),
    latest("tap_stats"),
    creatorRows(),
  ]);
  const list = (camps.rows.flatMap((r) => r.items) as Campaign[]).filter((c) => c?.id);
  const statsBy = new Map(stats.rows.map((r) => [r.slot, r.items as StatRow[]]));
  const people = new Map<string, Set<string>>();
  for (const c of creators) people.set(c.campaign_id, (people.get(c.campaign_id) ?? new Set()).add(c.username));
  const sum = (rows: StatRow[], i: 2 | 3 | 4 | 5) => Math.round(rows.reduce((s, r) => s + (Number(r[i]) || 0), 0) * 100) / 100;
  const campaigns = list.map((c) => {
    const [products, upto] = sums.by.get(c.id) ?? [0, 0];
    const st = statsBy.get(c.id) ?? [];
    return {
      id: c.id, name: c.name, status: statusOf(c), start: unixSeconds(c.campaign_start_time) || null, end: unixSeconds(c.campaign_end_time) || null,
      products, creators: people.get(c.id)?.size ?? 0, upto,
      gmvPaid: sum(st, 2), gmvSettled: sum(st, 3), comEst: sum(st, 4), comSettled: sum(st, 5),
    };
  });
  overview = { at: Date.now(), data: { asOf: sums.asOf, campaigns } };
  return overview.data;
}

export type Commission = { asOf: string | null; est: number; settled: number; gmvPaid: number; gmvSettled: number; campaigns: number; top: { name: string; est: number }[]; hasSettled: boolean };

let totals: { at: number; data: Commission } | null = null;

/** Techwide's partner commission across all TAP campaigns (lifetime totals from TikTok), for the admin Today card. Kept 5 minutes (it changes with the daily refresh). */
export async function commission(): Promise<Commission> {
  if (totals && Date.now() - totals.at < 5 * 60_000) return totals.data;
  const [camps, stats] = await Promise.all([latest("tap_campaigns"), latest("tap_stats")]);
  const names = new Map((camps.rows.flatMap((r) => r.items) as Campaign[]).map((c) => [c.id, c.name]));
  const per = stats.rows.map((r) => {
    const rows = r.items as StatRow[];
    const s = (i: 2 | 3 | 4 | 5) => rows.reduce((t, x) => t + (Number(x[i]) || 0), 0);
    return { name: names.get(r.slot) ?? r.slot, est: s(4), settled: s(5), paid: s(2), gmvSettled: s(3), full: rows.some((x) => x.length > 3) };
  });
  const round = (v: number) => Math.round(v * 100) / 100;
  const data: Commission = {
    asOf: stats.asOf,
    est: round(per.reduce((t, p) => t + p.est, 0)),
    settled: round(per.reduce((t, p) => t + p.settled, 0)),
    gmvPaid: round(per.reduce((t, p) => t + p.paid, 0)),
    gmvSettled: round(per.reduce((t, p) => t + p.gmvSettled, 0)),
    campaigns: names.size,
    top: per.filter((p) => p.est > 0).sort((a, b) => b.est - a.est).slice(0, 5).map((p) => ({ name: p.name, est: round(p.est) })),
    hasSettled: per.some((p) => p.full),
  };
  totals = { at: Date.now(), data };
  return data;
}

/**
 * The first 50 products shops submitted to a campaign that are waiting for Techwide's review, read live from TikTok in one call
 * (reading 250 took several seconds), and how many are waiting in all.
 */
export async function pendingProducts(campaignId: string): Promise<{ products: AdminTapProduct[]; total: number }> {
  const s = await storedSessions().partner();
  const [r, decided] = await Promise.all([listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "PENDING", pageSize: 50 }), recentlyDecided(campaignId).catch(() => new Set<string>())]);
  if (r.code !== 0) throw new Error(`TikTok ${r.code}: ${r.message}`);
  const all = (r.data?.products ?? []).map((p) => toAdminProduct(p as Raw));
  const products = all.filter((p) => !decided.has(p.id));
  return { products, total: Math.max(products.length, (r.data?.total_count ?? all.length) - (all.length - products.length)) };
}

type Decision = { id: string; approve: boolean; at: number };
/** How long a decision made here is trusted over TikTok's waiting list, which lags behind a decision (16 Oct 2026). */
const DECISION_MS = 60 * 60_000;

/** Products approved or declined here in the last hour: TikTok can still list them as waiting for a while. */
async function recentlyDecided(campaignId: string): Promise<Set<string>> {
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_reviewed&slot=eq.${encodeURIComponent(campaignId)}&select=items&order=as_of.desc&limit=1`)).json()) as { items: Decision[] }[];
  return new Set((row?.items ?? []).filter((d) => Date.now() - d.at < DECISION_MS).map((d) => d.id));
}

async function keepDecision(campaignId: string, productId: string, approve: boolean): Promise<void> {
  const today = mytToday();
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_reviewed&slot=eq.${encodeURIComponent(campaignId)}&as_of=eq.${today}&select=items&limit=1`)).json()) as { items: Decision[] }[];
  const items = [{ id: productId, approve, at: Date.now() }, ...(row?.items ?? []).filter((d) => d.id !== productId)].slice(0, 500);
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ dataset: "tap_reviewed", slot: campaignId, as_of: today, items, fetched_at: new Date().toISOString() }),
  });
}

export const REJECT_REASONS: [RejectReason, string][] = [
  ["COMMISSION_TOO_LOW", "Commission too low"],
  ["PRODUCT_HARD_TO_PROMOTE", "Hard to promote"],
  ["PRODUCT_TOO_EXPENSIVE", "Too expensive"],
  ["NO_SUITABLE_CREATOR", "No suitable creator"],
];

/** Approve a submitted product (it reaches creators with the next daily refresh) or decline it with TikTok's reason. */
export async function reviewProduct(campaignId: string, productId: string, approve: boolean, reason: RejectReason | null, name: string, actor: string, item?: AdminTapProduct | null): Promise<{ ok: boolean; error?: string }> {
  const s = await storedSessions().partner();
  const r = await reviewCampaignProduct(s.token, s.cipher, campaignId, productId, approve ? "APPROVE" : "REJECT", reason ? [reason] : []);
  if (r.code !== 0) return { ok: false, error: `TikTok didn't take the decision (${r.code}: ${r.message}).` };
  // TikTok's waiting list lags behind the decision: kept here so the product doesn't show as waiting again meanwhile.
  await Promise.all([
    keepDecision(campaignId, productId, approve),
    approve && item?.id === productId ? keepApproved(campaignId, item) : null,
  ]).catch((err) => console.error("[tap reviewed]", err instanceof Error ? err.message : err));
  await logActivity(actor, "TAP", `${approve ? "approved" : "declined"} ${name.slice(0, 60)} for a TAP campaign${!approve && reason ? ` (${REJECT_REASONS.find(([k]) => k === reason)?.[1]})` : ""}`);
  return { ok: true };
}
