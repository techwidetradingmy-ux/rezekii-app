import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getCampaignDetail, listCampaignProducts } from "../../integrations/tiktok-shop/partner.ts";
import { logActivity } from "../admin/admins.ts";
import { lastEndDay, startTime, toDay } from "../admin/campaign-dates.ts";
import { publish, saveCampaign } from "../admin/campaigns.ts";
import { pendingProducts, reviewProduct } from "../admin/tap.ts";
import { storedSessions } from "../refresh/sessions.ts";
import type { RequestStatus } from "../marketplace/shop-products.ts";

/**
 * Admin TAP pipeline on sellers' real requests (owner, 30 Oct 2026). A request moves: submitted → in_review (Techwide's review)
 * → approved (ready to send) → with_tiktok (Techwide's campaign for the shop exists; the seller registers the product in Seller
 * Center, then Techwide approves it on TikTok) → live. Or not_approved, with the reason the seller sees.
 */

type Step = { at: string; stage?: RequestStatus; what: string; who: string };
type Note = { at: string; who: string; text: string };
type Row = {
  id: string; shop_id: string; product_id: string; product_name: string; product_image: string | null; raise_pct: number; samples_per_sku: number;
  creator_conditions: Record<string, unknown>; status: RequestStatus; reason: string | null; campaign_id: string | null; commission_pct: number | null;
  total_rate: number | null; owner_name: string | null; notes: Note[]; history: Step[]; created_at: string; updated_at: string;
  /** The public commission when submitted, ×100. */
  public_rate: number | null;
};

/** Where the product is on TikTok, for a request sent to TikTok. Rates ×100. */
export type TikTokState = { state: "not_registered" | "pending" | "approved"; openRate: number | null; totalRate: number | null; samples: number | null };

export type PipelineRequest = Omit<Row, "raise_pct" | "commission_pct"> & { raise: number; commission: number | null; shop: string; shopCode: string | null; tiktok: TikTokState | null };

const SELECT = "id,shop_id,product_id,product_name,product_image,raise_pct,samples_per_sku,creator_conditions,status,reason,campaign_id,commission_pct,total_rate,owner_name,notes,history,created_at,updated_at,public_rate";

async function shopsById(ids: string[]): Promise<Map<string, { name: string; code: string | null }>> {
  if (!ids.length) return new Map();
  const rows = (await (await supabaseRest(`seller_connections?shop_id=in.(${ids.join(",")})&select=shop_id,shop_name,shop_code`)).json()) as { shop_id: string; shop_name: string; shop_code: string | null }[];
  return new Map(rows.map((r) => [r.shop_id, { name: r.shop_name, code: r.shop_code }]));
}

/** Approved products of one campaign (first 200), to see what TikTok has already approved. */
async function approvedIn(campaignId: string): Promise<Map<string, { total: number | null; open: number | null; samples: number | null }>> {
  const s = await storedSessions().partner();
  const out = new Map<string, { total: number | null; open: number | null; samples: number | null }>();
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const r = await listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "APPROVED", pageSize: 20, pageToken });
    if (r.code !== 0) break;
    for (const p of r.data?.products ?? []) out.set(p.id, { total: p.total_commission_rate ?? null, open: p.open_collaboration_commission_rate ?? null, samples: p.sample_quota ?? null });
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  return out;
}

const patch = (id: string, body: Record<string, unknown>) =>
  supabaseRest(`tap_submissions?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }) });

/** Every request that wasn't withdrawn, newest first; requests with TikTok show where TikTok has them (approved ones go Live). */
export async function listPipeline(): Promise<PipelineRequest[]> {
  const rows = (await (await supabaseRest(`tap_submissions?status=neq.withdrawn&select=${SELECT}&order=created_at.desc&limit=500`)).json()) as Row[];
  const shops = await shopsById([...new Set(rows.map((r) => r.shop_id))]);

  // TikTok's side, one campaign at a time: waiting for review, approved, or not registered by the seller yet.
  const tiktok = new Map<string, TikTokState>();
  const campaigns = [...new Set(rows.filter((r) => r.status === "with_tiktok" && r.campaign_id).map((r) => r.campaign_id as string))];
  await Promise.all(campaigns.map(async (c) => {
    const [pending, approved] = await Promise.all([pendingProducts(c).catch(() => ({ products: [] })), approvedIn(c).catch(() => new Map())]);
    for (const p of pending.products) tiktok.set(`${c}:${p.id}`, { state: "pending", openRate: p.open, totalRate: p.total, samples: p.samples });
    for (const [id, a] of approved) tiktok.set(`${c}:${id}`, { state: "approved", openRate: a.open, totalRate: a.total, samples: a.samples });
  }));

  const out: PipelineRequest[] = [];
  for (const r of rows) {
    let row = r;
    const t = r.status === "with_tiktok" && r.campaign_id ? tiktok.get(`${r.campaign_id}:${r.product_id}`) ?? { state: "not_registered" as const, openRate: null, totalRate: null, samples: null } : null;
    // Approved on TikTok (here or in Partner Center): the request is live.
    if (t?.state === "approved") {
      const history = [...r.history, { at: new Date().toISOString(), stage: "live" as const, what: "Approved on TikTok · live", who: "TikTok" }];
      await patch(r.id, { status: "live", total_rate: t.totalRate, history }).catch(() => null);
      row = { ...r, status: "live", total_rate: t.totalRate, history };
    }
    const shop = shops.get(r.shop_id);
    out.push({ ...row, raise: Number(r.raise_pct), commission: r.commission_pct === null ? null : Number(r.commission_pct), shop: shop?.name ?? "Shop", shopCode: shop?.code ?? null, tiktok: row.status === "with_tiktok" ? t : null });
  }
  return out;
}

/** Techwide's contact details from its newest running campaign, for a new campaign (TikTok requires a WhatsApp and an email). */
async function techwideContact(): Promise<{ whatsapp: string; email: string; phone: string } | null> {
  const [snap] = (await (await supabaseRest("market_snapshots?dataset=eq.tap_campaigns&select=items&order=as_of.desc&limit=1")).json()) as { items: { id: string; status?: string }[] }[];
  const s = await storedSessions().partner();
  for (const c of (snap?.items ?? []).filter((x) => x.status === "ONGOING").slice(0, 5)) {
    const d = await getCampaignDetail(s.token, s.cipher, String(c.id));
    const ci = d.data?.contact_info;
    if (d.code === 0 && ci?.whatsapp && ci?.email) return { whatsapp: ci.whatsapp, email: ci.email, phone: ci.phone ?? "" };
  }
  return null;
}

export type Action =
  | { action: "start" } | { action: "pass" } | { action: "reject"; reason: string } | { action: "submit"; commission?: number }
  | { action: "approve" } | { action: "note"; text: string } | { action: "assign"; name: string };

/** One admin step on a request. `actor` is the admin's name, as the history and the seller see it. */
export async function act(id: string, a: Action, actor: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "Request not found." };
  const [r] = (await (await supabaseRest(`tap_submissions?id=eq.${id}&select=${SELECT}`)).json()) as Row[];
  if (!r) return { ok: false, error: "Request not found." };
  const now = new Date().toISOString();
  const step = (stage: RequestStatus | undefined, what: string): Step[] => [...r.history, { at: now, ...(stage ? { stage } : {}), what, who: actor }];
  const name = r.product_name.slice(0, 60);

  switch (a.action) {
    case "start":
      if (r.status !== "submitted") return { ok: false, error: "This request is already being reviewed." };
      await patch(id, { status: "in_review", owner_name: r.owner_name ?? actor, history: step("in_review", "Review started") });
      return { ok: true };
    case "pass":
      if (r.status !== "in_review") return { ok: false, error: "Start the review first." };
      await patch(id, { status: "approved", history: step("approved", "Review passed") });
      await logActivity(actor, "TAP", `passed the TAP request for ${name}`);
      return { ok: true };
    case "reject": {
      const reason = (a.reason ?? "").trim().slice(0, 300);
      if (!reason) return { ok: false, error: "Say why, so the seller knows what to change." };
      if (!["submitted", "in_review", "approved"].includes(r.status)) return { ok: false, error: "Only requests not sent to TikTok yet can be not approved here." };
      await patch(id, { status: "not_approved", reason, history: step("not_approved", `Not approved: ${reason}`) });
      await logActivity(actor, "TAP", `didn't approve the TAP request for ${name}`);
      return { ok: true };
    }
    case "submit": {
      if (r.status !== "approved") return { ok: false, error: "Pass the review first." };
      const c = await shopCampaign(r.shop_id, Number(a.commission), actor);
      if (!c.ok) return c;
      await patch(id, { status: "with_tiktok", campaign_id: c.campaignId, commission_pct: c.commission, history: step("with_tiktok", `Sent to TikTok · campaign ${c.campaignId}`) });
      return { ok: true };
    }
    case "approve": {
      if (r.status !== "with_tiktok" || !r.campaign_id) return { ok: false, error: "This request isn't waiting on TikTok." };
      const { products } = await pendingProducts(r.campaign_id);
      const item = products.find((p) => p.id === r.product_id);
      if (!item) return { ok: false, error: "TikTok doesn't show it waiting yet. The seller registers it in Seller Center first." };
      const done = await reviewProduct(r.campaign_id, r.product_id, true, null, r.product_name, actor, item);
      if (!done.ok) return { ok: false, error: done.error ?? "TikTok didn't take the approval." };
      await patch(id, { status: "live", total_rate: item.total, history: step("live", "Approved on TikTok · live") });
      return { ok: true };
    }
    case "note": {
      const text = (a.text ?? "").trim().slice(0, 1000);
      if (!text) return { ok: false, error: "Write the note first." };
      await patch(id, { notes: [...r.notes, { at: now, who: actor, text }] });
      return { ok: true };
    }
    case "assign": {
      const who = (a.name ?? "").trim().slice(0, 60);
      if (!who) return { ok: false, error: "Choose who owns it." };
      await patch(id, { owner_name: who, history: step(undefined, `Assigned to ${who}`) });
      return { ok: true };
    }
  }
  return { ok: false, error: "Unknown step." };
}

/**
 * The shop's Techwide campaign (owner, 31 Oct 2026: one per shop, public like all of Techwide's campaigns): reused when the shop
 * has one, otherwise created at `commission` percent and published, running as long as TikTok allows (360 days).
 */
/** What every new shop's campaign starts with (Admin › Settings). `{shop}` in the description becomes the shop's name. */
export type SellerCampaignSettings = { commission: number; description: string };
export const SELLER_CAMPAIGN_DEFAULT: SellerCampaignSettings = {
  commission: 10,
  description: [
    "Techwide's affiliate campaign for {shop}, opened on Rezekii.",
    "{shop}: register your products here. Techwide reviews each product, then creators on Rezekii can add it to their showcase, ask for free samples and post videos.",
    "Other sellers: want a campaign like this for your shop? Install Rezekii from the TikTok Shop App Store (Creator Collaborations) and connect your shop. Rezekii opens your own campaign and shows your creators, samples and sales in one place.",
  ].join("\n\n"),
};
export async function sellerCampaignSettings(): Promise<SellerCampaignSettings> {
  const [row] = (await (await supabaseRest("app_settings?key=eq.seller_campaign&select=value&limit=1")).json()) as { value: Partial<SellerCampaignSettings> }[];
  return { ...SELLER_CAMPAIGN_DEFAULT, ...(row?.value ?? {}) };
}
export async function saveSellerCampaignSettings(v: SellerCampaignSettings, by: string, actor: string): Promise<void> {
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: "seller_campaign", value: v, updated_at: new Date().toISOString(), updated_by: by }) });
  await logActivity(actor, "TAP", `set new seller campaigns to ${v.commission}% with a new description`);
}

/**
 * The shop's own Techwide campaign (owner, 31 Oct 2026): made and published when the shop connects Seller Center, so the seller
 * registers products straight into it in Seller Center, once. Public, so every seller in Seller Center can see it.
 */
export async function ensureSellerCampaign(shopId: string, actor = "Rezekii"): Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  const [conn] = (await (await supabaseRest(`seller_connections?shop_id=eq.${shopId}&select=shop_name,campaign_id&limit=1`)).json()) as { shop_name: string; campaign_id: string | null }[];
  if (!conn) return { ok: false, error: "The shop isn't connected any more. Ask the seller to connect Seller Center again." };
  if (conn.campaign_id) return { ok: true, campaignId: conn.campaign_id };
  const set = await sellerCampaignSettings();
  const c = await shopCampaign(shopId, set.commission, actor, set.description.replaceAll("{shop}", conn.shop_name).slice(0, 999));
  if (!c.ok) return c;
  await supabaseRest(`seller_connections?shop_id=eq.${shopId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ campaign_id: c.campaignId }) });
  return { ok: true, campaignId: c.campaignId };
}

async function shopCampaign(shopId: string, commission: number, actor: string, description?: string): Promise<{ ok: true; campaignId: string; commission: number | null } | { ok: false; error: string }> {
  const [own] = (await (await supabaseRest(`seller_connections?shop_id=eq.${shopId}&campaign_id=not.is.null&select=campaign_id&limit=1`)).json()) as { campaign_id: string }[];
  if (own) return { ok: true, campaignId: own.campaign_id, commission: null };
  const [had] = (await (await supabaseRest(`tap_submissions?shop_id=eq.${shopId}&campaign_id=not.is.null&select=campaign_id,commission_pct&order=updated_at.desc&limit=1`)).json()) as { campaign_id: string; commission_pct: number | null }[];
  if (had) return { ok: true, campaignId: had.campaign_id, commission: had.commission_pct === null ? null : Number(had.commission_pct) };
  if (!(commission > 1 && commission < 80)) return { ok: false, error: "Set the campaign commission: more than 1% and less than 80%." };
  const shop = (await shopsById([shopId])).get(shopId);
  if (!shop) return { ok: false, error: "The shop isn't connected any more. Ask the seller to connect Seller Center again." };
  const contact = await techwideContact();
  if (!contact) return { ok: false, error: "Couldn't read Techwide's campaign contact details from TikTok. Please try again." };
  const today = toDay(Math.floor(Date.now() / 1000));
  const end = lastEndDay(startTime(today, Date.now()));
  const title = `Techwide X ${shop.name}`.slice(0, 49);
  const saved = await saveCampaign({ name: title, description: description ?? `Techwide's TAP campaign for ${shop.name} on Rezekii.`, start: today, end, regEnd: end, commission, local: true, crossBorder: true, shopCodes: [], ...contact }, null, actor);
  if (!saved.ok) return saved;
  const pub = await publish(saved.id, title, actor);
  if (!pub.ok) return { ok: false, error: pub.error ?? "TikTok didn't publish the campaign." };
  return { ok: true, campaignId: saved.id, commission };
}

/**
 * Straight to Seller Center (owner, 31 Oct 2026): a seller's new requests skip the wait for Techwide's first review. Rezekii
 * finds or makes the shop's campaign and the seller registers the products there right away; Techwide reviews them in TikTok
 * (Approve in the pipeline). The campaign's commission is what the seller asked for: the public rate plus their extra.
 */
export async function handOff(shopId: string, productIds: string[]): Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  if (!productIds.length) return { ok: false, error: "Nothing to send." };
  const list = (await (await supabaseRest(`tap_submissions?shop_id=eq.${shopId}&product_id=in.(${productIds.join(",")})&status=eq.submitted&select=id,raise_pct,public_rate,history`)).json()) as { id: string; raise_pct: number; public_rate: number | null; history: Step[] }[];
  if (!list.length) return { ok: false, error: "Nothing to send." };
  const asked = Math.max(...list.map((r) => (r.public_rate === null ? 10 : r.public_rate / 100) + Number(r.raise_pct)));
  const c = await shopCampaign(shopId, Math.min(79, Math.max(2, Math.round(asked * 10) / 10)), "Rezekii");
  if (!c.ok) return c;
  const now = new Date().toISOString();
  for (const r of list) {
    await patch(r.id, { status: "with_tiktok", campaign_id: c.campaignId, commission_pct: c.commission, history: [...r.history, { at: now, stage: "with_tiktok", what: "Ready to register in Seller Center", who: "Rezekii" }] });
  }
  return { ok: true, campaignId: c.campaignId };
}
