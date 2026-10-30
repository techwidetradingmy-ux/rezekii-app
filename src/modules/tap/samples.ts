import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { ApiReply } from "../../integrations/tiktok-shop/api.ts";
import { getSampleDeeplink, getSampleLabel, lookupProducts, searchSampleApplications, type SampleLabel } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { linkedCreators } from "../sales/orders.ts";
import { makeTapLink } from "./links.ts";
import { addByTapLink } from "./showcase.ts";
import { sampleStage } from "./stages.ts";

/** A free sample a creator asked for on Rezekii. Since 14 Oct 2026 they submit it in TikTok themselves (status "applied"); older rows were Rezekii's own queue. */
export type SampleRequest = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  shop: string | null;
  image: string | null;
  status: "requested" | "applied" | "rejected" | "cancelled";
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function mySamples(userId: string): Promise<SampleRequest[]> {
  const res = await supabaseRest(`sample_requests?user_id=eq.${userId}&status=neq.cancelled&order=created_at.desc&limit=200`);
  return res.json();
}

export async function cancelSample(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const res = await supabaseRest(`sample_requests?id=eq.${id}&user_id=eq.${userId}&status=eq.requested`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }),
  });
  return ((await res.json()) as unknown[]).length > 0;
}

export type SampleLinkResult = { ok: true; deeplink: string; addedToShowcase: boolean } | { ok: false; error: string; status: number };

/** The product's TAP campaign and the samples its seller registered there (TikTok's campaign sample number), for the sample request. */
async function sampleTarget(productId: string) {
  const [row] = (await (await supabaseRest(`tap_catalog?product_id=eq.${productId}&select=campaign_id,name,shop,image,samples&limit=1`)).json()) as { campaign_id: string; name: string; shop: string | null; image: string | null; samples: number }[];
  return row ?? null;
}

/** Where TikTok sends the creator after they submit the sample request in the TikTok app. */
const BACK_TO_REZEKII = "https://rezekii.com/app/my-tap?sample=sent";

/** What TikTok's live sample check ("Applicable Sample Label") says for one creator and product. */
export type SampleVerdict = "available" | "none" | "requested" | "limit";

/**
 * The verdict from TikTok's live check (owner, 16 Oct 2026: only a sample TikTok really offers can be requested). TikTok's
 * campaign sample number was wrong for many products, both ways, so it isn't used for this.
 */
export function sampleVerdict(label: SampleLabel | undefined): SampleVerdict {
  if (!label) return "none";
  if (label.application_id || label.status === "ONGOING") return "requested";
  if (label.reach_limit) return "limit";
  if (label.can_apply === false) return "none";
  return (label.sample_product?.sample_sku_list ?? []).some((o) => o.is_available) ? "available" : "none";
}

/** Whether a product offers free samples at all, whoever asks: an option has samples left, or this creator already asked. */
export const offersSamples = (label: SampleLabel | undefined): boolean =>
  !!label && (!!label.application_id || label.status === "ONGOING" || (label.sample_product?.sample_sku_list ?? []).some((o) => o.is_available));

/**
 * TikTok's live answer turned into the option to ask for, or the reason the creator can't. Only an option TikTok lists as
 * available is asked for, so the sample request page TikTok opens really has a sample.
 */
export function sampleChoice(label: SampleLabel | undefined): { ok: true; skuId: string } | { ok: false; error: string; status: number } {
  const verdict = sampleVerdict(label);
  if (verdict === "requested") return { ok: false, error: "You already requested this sample in TikTok. Follow it in My Samples.", status: 409 };
  if (verdict === "limit") return { ok: false, error: "You've reached TikTok's limit on open sample requests. Post content for the samples you have, then try again.", status: 409 };
  if (label?.can_apply === false || !(label?.sample_product?.sample_sku_list ?? []).length) return { ok: false, error: "TikTok doesn't offer a free sample of this product to your account.", status: 409 };
  const sku = label?.sample_product?.sample_sku_list?.find((o) => o.is_available)?.id;
  if (!sku) return { ok: false, error: "Every option of this product is out of stock for samples right now.", status: 409 };
  return { ok: true, skuId: sku };
}

const OFFERS = "market_snapshots?dataset=eq.tap_samples&slot=eq.offers";

/** Which TAP products TikTok's live check found offering free samples (1) or not (0), by product ID: the newest check, or `day`'s. */
export async function sampleOffers(day?: string): Promise<Record<string, number>> {
  const [row] = (await (await supabaseRest(`${OFFERS}${day ? `&as_of=eq.${day}` : ""}&select=items&order=as_of.desc&limit=1`)).json()) as { items: Record<string, number>[] }[];
  return row?.items?.[0] ?? {};
}

export async function saveSampleOffers(day: string, offers: Record<string, number>): Promise<void> {
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ dataset: "tap_samples", slot: "offers", as_of: day, items: [offers], fetched_at: new Date().toISOString() }),
  });
}

/** TAP products whose sellers registered samples in Techwide's campaign (TikTok's campaign sample number above 0), best-selling first. */
export async function campaignSampleProducts(): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`tap_catalog?samples=gt.0&select=product_id&order=sold.desc,product_id.asc&offset=${offset}&limit=1000`)).json()) as { product_id: string }[];
    out.push(...page.map((r) => r.product_id));
    if (page.length < 1000) return out;
  }
}

/** One creator's own TikTok check of the products with confirmed campaign samples: 2 = they can request it, 1 = already requested, 0 = not for them. */
export type CreatorOffers = { offers: Record<string, number>; limit: boolean; day: string };
const mineSlot = (userId: string) => encodeURIComponent(`user:${userId}`);

export async function creatorOffers(userId: string): Promise<CreatorOffers | null> {
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_samples&slot=eq.${mineSlot(userId)}&select=as_of,items&order=as_of.desc&limit=1`)).json()) as { as_of: string; items: [Record<string, number>, { limit?: boolean }?] }[];
  return row ? { offers: row.items?.[0] ?? {}, limit: !!row.items?.[1]?.limit, day: row.as_of } : null;
}

async function saveCreatorOffers(userId: string, o: CreatorOffers): Promise<void> {
  await supabaseRest("market_snapshots?on_conflict=dataset,slot,as_of", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ dataset: "tap_samples", slot: `user:${userId}`, as_of: o.day, items: [o.offers, { limit: o.limit }], fetched_at: new Date().toISOString() }),
  });
}

const myt = (t: number) => new Date(t + 8 * 3600_000).toISOString().slice(0, 10);
const checking = new Set<string>();

/**
 * Which free samples this creator can really request (owner, 16 Oct 2026): sellers may give samples only to some creators,
 * so each product with confirmed campaign samples gets TikTok's live check as this creator, 5 at a time (about 30 seconds
 * for 400 products). Saved for the Samples available filter and the badges. Null when their TikTok Shop isn't linked.
 */
export async function checkCreatorSamples(userId: string): Promise<CreatorOffers | null> {
  if (checking.has(userId)) return null;
  checking.add(userId);
  try {
    const token = await approvedCreatorToken(userId);
    if (!token) return null;
    const [confirmed, asked] = await Promise.all([sampleOffers(), tiktokSampleStatus(userId).catch(() => new Map<string, string>())]);
    const ids = (await campaignSampleProducts()).filter((id) => !(id in confirmed) || confirmed[id] === 1);
    const out: CreatorOffers = { offers: {}, limit: false, day: myt(Date.now()) };
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      const replies = await Promise.all(batch.map((id) => getSampleLabel(token, id).catch(() => null)));
      replies.forEach((r, k) => {
        if (r?.code !== 0) return;
        const v = sampleVerdict(r.data?.label);
        if (v === "limit") out.limit = true;
        out.offers[batch[k]] = v === "available" ? 2 : v === "requested" ? 1 : 0;
      });
    }
    // TikTok's live check just says "can't apply" once a creator has asked; their own TikTok sample list says they asked.
    for (const [id, st] of asked) if (id in out.offers && sampleStage(st) >= 1) out.offers[id] = 1;
    await saveCreatorOffers(userId, out);
    return out;
  } finally {
    checking.delete(userId);
  }
}

/** After a sample request, that product counts as requested for the creator until their next check. */
async function markRequested(userId: string, productId: string): Promise<void> {
  const mine = await creatorOffers(userId);
  if (mine && productId in mine.offers) await saveCreatorOffers(userId, { ...mine, offers: { ...mine.offers, [productId]: 1 } });
}

/** A linked, approved creator's TikTok Shop token, for checking which products offer samples (any linked creator will do). */
export async function sampleCheckToken(): Promise<string | null> {
  for (const id of await linkedCreators()) {
    const token = await approvedCreatorToken(id).catch(() => null);
    if (token) return token;
  }
  return null;
}

/**
 * Whether this creator can get a free sample of the product through Techwide's TAP campaign: none unless the seller registered
 * samples in the campaign, then TikTok's live check. Null when it can't be asked (TikTok Shop not linked, or TikTok didn't answer).
 */
export async function sampleStatus(userId: string, productId: string): Promise<SampleVerdict | null> {
  if (!/^\d{6,25}$/.test(productId)) return null;
  const t = await sampleTarget(productId);
  if (!t || t.samples <= 0) return "none";
  const token = await approvedCreatorToken(userId);
  if (!token) return null;
  // Already asked (in TikTok, from Rezekii or directly): TikTok's live check then only says "can't apply".
  const asked = (await tiktokSampleStatus(userId).catch(() => new Map<string, string>())).get(productId);
  if (asked && sampleStage(asked) >= 1) return "requested";
  const r = await getSampleLabel(token, productId);
  if (r.code !== 0) {
    console.error("[sample status]", r.code, r.message);
    return null;
  }
  return sampleVerdict(r.data?.label);
}

/** TikTok's "your token has been deauthorized". */
const DEAUTHORIZED = 36009005;

/**
 * Asks TikTok again for about 12 seconds while it refuses the creator's sign-in: TikTok can do so for some seconds just after
 * a creator links TikTok Shop (16 Oct 2026: a sign-in from 17:28 was refused at 17:29:15–24 and accepted again by 17:31).
 */
async function patiently<T>(call: () => Promise<ApiReply<T>>): Promise<ApiReply<T>> {
  let r = await call();
  for (const ms of [2000, 4000, 6000]) {
    if (r.code !== DEAUTHORIZED) return r;
    await new Promise((done) => setTimeout(done, ms));
    r = await call();
  }
  return r;
}

const RELINK = "TikTok has cancelled Rezekii's link to your TikTok Shop. In Account, unlink TikTok Shop and link it again.";

/**
 * Request sample through Techwide's TAP campaign, opening TikTok's own sample request page (TikTok has no API to submit it:
 * the creator confirms it in the TikTok app). The owner's rule (14 Oct 2026): the product goes into the creator's showcase
 * through Techwide's TAP link first, every time, so the sample counts for Techwide's campaign. TikTok then says whether this
 * creator may ask and which options allow a sample. The click is logged; only TikTok's own status counts as requested.
 */
export async function sampleLink(userId: string, productId: string): Promise<SampleLinkResult> {
  if (!/^\d{6,25}$/.test(productId)) return { ok: false, error: "This product is no longer in the Marketplace.", status: 404 };
  // Fast (owner, 16 Oct 2026: no waiting): steps that don't depend on each other run at the same time.
  const [token, t] = await Promise.all([approvedCreatorToken(userId), sampleTarget(productId)]);
  if (!token) return { ok: false, error: "Link your TikTok Shop first, then request the sample.", status: 403 };
  if (!t) return { ok: false, error: "This product is no longer in the Marketplace.", status: 404 };
  // Samples go through Techwide's TAP campaign, so the seller must have registered samples there (owner, 16 Oct 2026).
  if (t.samples <= 0) return { ok: false, error: "This product has no free samples through Rezekii.", status: 409 };
  // TikTok's live check and the TAP link together (making the link doesn't touch the showcase): the product goes into the
  // showcase only when TikTok really offers this creator the sample.
  const [label, tap] = await Promise.all([patiently(() => getSampleLabel(token, productId)), makeTapLink(userId, productId)]);
  if (label.code !== 0) {
    console.error("[sample label]", label.code, label.message);
    if (label.code === DEAUTHORIZED) return { ok: false, error: RELINK, status: 401 };
    return { ok: false, error: "TikTok couldn't check this product's samples right now. Please try again in a minute.", status: 502 };
  }
  const pick = sampleChoice(label.data?.label);
  if (!pick.ok) return pick;
  if (!tap.ok) return { ok: false, error: tap.error, status: tap.status };
  // Re-adding a product that is already in the showcase is accepted by TikTok and binds it to the TAP link.
  const added = await addByTapLink(userId, token, tap.link);
  if (!added.added) return { ok: false, error: added.error || "Your showcase couldn't take this product, so the sample can't be requested yet.", status: added.status || 502 };
  const ask = (redirect?: string) => patiently(() => getSampleDeeplink(token, { productId, skuId: pick.skuId, campaignId: t.campaign_id, redirect }));
  let r = await ask(BACK_TO_REZEKII);
  if (r.code !== 0) r = await ask();
  if (r.code !== 0 || !r.data?.deeplink) {
    console.error("[sample link]", r.code, r.message, r.request_id);
    return { ok: false, error: "TikTok couldn't open the sample request for this product right now. Please try again later.", status: 502 };
  }
  // The creator submits it in TikTok next: My Samples reads their TikTok sample list afresh, and the click is logged.
  appCache.delete(userId);
  await Promise.all([markRequested(userId, productId).catch(() => undefined), logRequest(userId, productId, t).catch(() => undefined)]);
  return { ok: true, deeplink: r.data.deeplink, addedToShowcase: true };
}

async function logRequest(userId: string, productId: string, t: { name: string; shop: string | null; image: string | null }): Promise<void> {
  const open = await supabaseRest(`sample_requests?user_id=eq.${userId}&product_id=eq.${productId}&status=in.(requested,applied)&select=id&limit=1`);
  if (((await open.json()) as unknown[]).length) return;
  await supabaseRest("sample_requests", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, product_id: productId, product_name: t.name, shop: t.shop, image: t.image, status: "applied", note: "Requested in TikTok through Techwide's TAP campaign" }),
  });
}

type Application = { id: string; productId: string; variant: string; status: string; dueAt: number | null };
const appCache = new Map<string, { at: number; apps: Application[] }>();

/** The creator's own sample requests from TikTok (every status, newest 200), kept a minute (`fresh`: read TikTok now). */
async function applications(userId: string, fresh = false): Promise<Application[] | null> {
  const hit = appCache.get(userId);
  // Kept a minute: a sample the creator just submitted in TikTok shows on My Samples straight after.
  if (!fresh && hit && Date.now() - hit.at < 60_000) return hit.apps;
  const token = await approvedCreatorToken(userId);
  if (!token) return null;
  const apps: Application[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 4; page++) {
    const r = await searchSampleApplications(token, pageToken);
    if (r.code !== 0) {
      console.error("[sample applications]", r.code, r.message);
      return null;
    }
    for (const a of r.data?.sample_applications ?? [])
      if (a.sample_product?.id)
        apps.push({ id: a.id, productId: a.sample_product.id, variant: (a.sample_product.sku_sale_property_value_names ?? []).join(" / "), status: a.status, dueAt: a.creator_fulfillment?.expiration_time ?? null });
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  appCache.set(userId, { at: Date.now(), apps });
  return apps;
}

export type SellerSample = { id: string; productId: string; name: string; shop: string; image: string | null; variant: string; status: string; dueAt: number | null };
const sellerCache = new Map<string, { at: number; rows: SellerSample[] }>();

/**
 * Samples the creator asked sellers for directly (not through Techwide's TAP campaigns), from TikTok, kept 10 minutes.
 * `tapProducts` are the creator's TAP products, which My TAP products already shows with their campaign sample status.
 */
export async function sellerSamples(userId: string, tapProducts: Set<string>): Promise<SellerSample[]> {
  const hit = sellerCache.get(userId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.rows.filter((r) => !tapProducts.has(r.productId));
  const token = await approvedCreatorToken(userId);
  const apps = token ? await applications(userId) : null;
  if (!token || !apps) return [];
  const ids = [...new Set(apps.map((a) => a.productId))];
  const facts = new Map<string, { title: string; main_image_url?: string; shop?: { name: string } }>();
  for (let i = 0; i < ids.length; i += 20) {
    const r = await lookupProducts(token, ids.slice(i, i + 20));
    for (const p of r.data?.products ?? []) facts.set(p.id, p);
  }
  const rows = apps.map((a) => {
    const f = facts.get(a.productId);
    return { ...a, name: f?.title ?? "TikTok Shop product", shop: f?.shop?.name ?? "", image: f?.main_image_url ?? null };
  });
  sellerCache.set(userId, { at: Date.now(), rows });
  return rows.filter((r) => !tapProducts.has(r.productId));
}

/** One sample a creator asked for on Rezekii, with TikTok's own status when TikTok has it. */
export type AdminSample = {
  id: string;
  creator: string;
  productId: string;
  name: string;
  shop: string | null;
  image: string | null;
  askedAt: string;
  /** TikTok's status, e.g. PENDING or SHIPPED; null when TikTok has no request (not submitted in TikTok, or before 14 Oct 2026). */
  tiktok: { status: string; variant: string; dueAt: number | null } | null;
  /** False when the creator's TikTok Shop couldn't be read (unlinked or TikTok error). */
  checked: boolean;
};

/** Every sample creators asked for on Rezekii (newest 300), each with its live status from the creator's TikTok sample requests. */
export async function adminSamples(): Promise<AdminSample[]> {
  type Row = SampleRequest & { app_users: { display_name: string | null; tiktok_username: string | null; email: string | null } | null };
  const rows = (await (await supabaseRest("sample_requests?status=neq.cancelled&select=*,app_users(display_name,tiktok_username,email)&order=created_at.desc&limit=300")).json()) as Row[];
  const byUser = new Map<string, Application[] | null>();
  // Read TikTok afresh: an approval or rejection made in Partner Center shows as soon as TikTok has it.
  await Promise.all([...new Set(rows.map((r) => r.user_id))].map(async (u) => byUser.set(u, await applications(u, true).catch(() => null))));
  return rows.map(({ app_users: u, ...r }) => {
    const apps = byUser.get(r.user_id) ?? null;
    const a = apps?.find((x) => x.productId === r.product_id);
    return {
      id: r.id,
      creator: u?.tiktok_username ? `@${u.tiktok_username}` : u?.display_name || u?.email || "Unknown",
      productId: r.product_id,
      name: r.product_name,
      shop: r.shop,
      image: r.image,
      askedAt: r.created_at,
      tiktok: a ? { status: a.status, variant: a.variant, dueAt: a.dueAt } : null,
      checked: apps !== null,
    };
  });
}

/** TikTok's status for each product the creator asked a sample of, from their own TikTok sample requests (newest first). */
export async function tiktokSampleStatus(userId: string): Promise<Map<string, string>> {
  const apps = await applications(userId).catch(() => null);
  const out = new Map<string, string>();
  for (const a of apps ?? []) if (!out.has(a.productId)) out.set(a.productId, a.status);
  return out;
}

/** Whether TikTok offers this creator a sample of the product right now (null when TikTok didn't answer). */
export async function sampleOffered(token: string, productId: string): Promise<boolean | null> {
  const r = await getSampleLabel(token, productId).catch(() => null);
  if (!r || r.code !== 0) return null;
  const l = r.data?.label;
  if (l?.application_id) return true;
  return l?.can_apply !== false && (l?.sample_product?.sample_sku_list ?? []).some((o) => o.is_available);
}
