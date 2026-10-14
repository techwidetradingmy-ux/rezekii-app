import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { NOT_IN_SHOWCASE, getSampleDeeplink, lookupProducts, searchSampleApplications } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { addToShowcase } from "./showcase.ts";

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

/** The TAP campaign and the SKU with the most stock, for TikTok's sample request link. */
async function sampleTarget(productId: string) {
  const [row] = (await (await supabaseRest(`tap_catalog?product_id=eq.${productId}&select=campaign_id,name,shop,image,samples&limit=1`)).json()) as { campaign_id: string; name: string; shop: string | null; image: string | null; samples: number }[];
  if (!row) return null;
  const [snap] = (await (await supabaseRest(`market_snapshots?dataset=eq.tap_products&slot=eq.${encodeURIComponent(row.campaign_id)}&select=items&order=as_of.desc&limit=1`)).json()) as { items: { id: string; sku_information_list?: { sku_id?: string; inventory?: { available_quantity?: number | string } }[] }[] }[];
  const skus = snap?.items?.find((i) => i.id === productId)?.sku_information_list ?? [];
  const sku = [...skus].sort((x, y) => Number(y.inventory?.available_quantity ?? 0) - Number(x.inventory?.available_quantity ?? 0))[0]?.sku_id;
  return { ...row, skuId: sku ?? null };
}

/**
 * Request sample through Techwide's TAP campaign: TikTok's own sample request page, drawing on the campaign's sample budget.
 * TikTok only allows it for products in the creator's showcase, so the product is added by its TAP link first when needed.
 * The request is logged so My TAP products shows it until TikTok's campaign data has it.
 */
export async function sampleLink(userId: string, productId: string): Promise<SampleLinkResult> {
  if (!/^\d{6,25}$/.test(productId)) return { ok: false, error: "This product is no longer in a Techwide TAP campaign.", status: 404 };
  const token = await approvedCreatorToken(userId);
  if (!token) return { ok: false, error: "Link your TikTok Shop first, then request the sample.", status: 403 };
  const t = await sampleTarget(productId);
  if (!t) return { ok: false, error: "This product is no longer in a Techwide TAP campaign.", status: 404 };
  if (t.samples <= 0) return { ok: false, error: "This product has no free samples right now.", status: 409 };
  if (!t.skuId) return { ok: false, error: "TikTok Shop didn't send this product's options yet. Try again after the next daily refresh.", status: 502 };
  const ask = () => getSampleDeeplink(token, { productId, skuId: t.skuId!, campaignId: t.campaign_id });
  let r = await ask();
  let added = false;
  if (r.code === NOT_IN_SHOWCASE) {
    const a = await addToShowcase(userId, productId);
    if (!a.added) return { ok: false, error: a.error || "Add the product to your showcase first, then request the sample.", status: a.status || 502 };
    added = true;
    r = await ask();
  }
  if (r.code !== 0 || !r.data?.deeplink) {
    console.error("[sample link]", r.code, r.message, r.request_id);
    return { ok: false, error: r.message || "TikTok didn't open the sample request. Please try again.", status: 502 };
  }
  const open = await supabaseRest(`sample_requests?user_id=eq.${userId}&product_id=eq.${productId}&status=in.(requested,applied)&select=id&limit=1`);
  if (!((await open.json()) as unknown[]).length)
    await supabaseRest("sample_requests", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, product_id: productId, product_name: t.name, shop: t.shop, image: t.image, status: "applied", note: "Requested in TikTok through Techwide's TAP campaign" }),
    });
  return { ok: true, deeplink: r.data.deeplink, addedToShowcase: added };
}

type Application = { id: string; productId: string; variant: string; status: string; dueAt: number | null };
const appCache = new Map<string, { at: number; apps: Application[] }>();

/** The creator's own sample requests from TikTok (every status, newest 200), kept 10 minutes. */
async function applications(userId: string): Promise<Application[] | null> {
  const hit = appCache.get(userId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.apps;
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
  await Promise.all([...new Set(rows.map((r) => r.user_id))].map(async (u) => byUser.set(u, await applications(u).catch(() => null))));
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
