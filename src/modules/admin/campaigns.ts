import { createCampaign, editCampaign, getCampaignDetail, listCampaignProducts, publishCampaign, type CampaignFields } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { logActivity } from "./admins.ts";
import { dayEnd, firstEndDay, lastEndDay, latestEnd, longDay, startTime, toDay } from "./campaign-dates.ts";

/** The campaign form as admins fill it in: dates are Malaysia days (YYYY-MM-DD), commission a percentage. */
export type CampaignForm = {
  name: string;
  description: string;
  /** Shops can register from the campaign's start day (TikTok requires the two to match) until this day. */
  regEnd: string;
  start: string;
  end: string;
  commission: number;
  local: boolean;
  crossBorder: boolean;
  shopCodes: string[];
  whatsapp: string;
  email: string;
  phone: string;
  /** An existing campaign's start time as TikTok has it (the form shows only its day). */
  startAt?: number | null;
};

const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
export { toDay };

/**
 * A phone number in TikTok's international format (E.164, e.g. +60123456789), or null. Malaysian numbers can be typed any usual
 * way: "012-345 6789", "60123456789" and "+60 12-345 6789" all become +60123456789 (TikTok refuses them otherwise).
 */
export function e164(raw: string): string | null {
  const d = raw.trim().replace(/[\s\-().]/g, "");
  const n = d.startsWith("+") ? d : d.startsWith("00") ? `+${d.slice(2)}` : d.startsWith("60") ? `+${d}` : d.startsWith("0") ? `+60${d.slice(1)}` : `+60${d}`;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/**
 * Checks the form against TikTok's rules (campaign-dates.ts) and turns it into TikTok's fields. `isNew`: a new campaign can't
 * start before today; an existing one keeps its saved start time while its start day is unchanged. A start time that has passed
 * becomes 10 minutes from `now`. Ending on the last day allowed ends exactly 360 days after the start (TikTok's most).
 */
export function campaignFields(f: CampaignForm, now = Date.now(), isNew = true): { ok: true; fields: CampaignFields } | { ok: false; error: string } {
  const name = f.name.trim();
  if (!name) return { ok: false, error: "Give the campaign a name." };
  if (name.length >= 50) return { ok: false, error: "The name must be under 50 characters." };
  const description = f.description.trim();
  if (!description) return { ok: false, error: "TikTok needs a description for shops." };
  if (description.length > 1000) return { ok: false, error: "The description can be at most 1,000 characters." };
  if (![f.start, f.end, f.regEnd].every(isDay)) return { ok: false, error: "Fill in all three dates." };
  if (isNew && f.start < toDay(Math.floor(now / 1000))) return { ok: false, error: "A new campaign can't start before today." };
  const start = startTime(f.start, now, isNew ? null : f.startAt);
  const first = firstEndDay(start), last = lastEndDay(start);
  if (f.end < first) return { ok: false, error: `The campaign has to run at least 1 day: end it on ${longDay(first)} or later.` };
  if (f.end > last) return { ok: false, error: `A campaign can run for at most 360 days: end it on ${longDay(last)} at the latest.` };
  if (f.regEnd > f.end) return { ok: false, error: "Registration has to close by the campaign's end day." };
  if (f.regEnd < first) return { ok: false, error: `Registration has to stay open at least 1 day: close it on ${longDay(first)} or later.` };
  // TikTok: registration opens when the campaign starts.
  const run = [start, Math.min(dayEnd(f.end), latestEnd(start))];
  const reg = [start, Math.min(dayEnd(f.regEnd), run[1])];
  const rate = Math.round(Number(f.commission) * 100);
  if (!(rate > 100 && rate < 8000)) return { ok: false, error: "Commission must be more than 1% and less than 80%." };
  const shopCodes = f.shopCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
  const types = [...(f.local ? ["LOCAL" as const] : []), ...(f.crossBorder ? ["CROSS_BORDER" as const] : [])];
  if (!types.length && !shopCodes.length) return { ok: false, error: "Choose which shops can register: local, cross-border, or specific shop codes." };
  if (!f.whatsapp.trim()) return { ok: false, error: "TikTok needs a WhatsApp number for campaigns in Malaysia." };
  const whatsapp = e164(f.whatsapp);
  if (!whatsapp) return { ok: false, error: "That WhatsApp number doesn't look right. Use a number like 012-345 6789 or +60 12-345 6789." };
  const phone = f.phone.trim() ? e164(f.phone) : "";
  if (phone === null) return { ok: false, error: "That phone number doesn't look right. Use a number like 012-345 6789 or +60 12-345 6789." };
  const email = f.email.trim();
  // TikTok requires a contact email too (16 Oct 2026: "Email of ContactInfo is a required field").
  if (!email) return { ok: false, error: "TikTok needs a contact email for the campaign." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address doesn't look right." };
  return {
    ok: true,
    fields: {
      name, description,
      registration_start_time: reg[0], registration_end_time: reg[1], campaign_start_time: run[0], campaign_end_time: run[1],
      commission_rate: rate,
      contact_info: { whatsapp, email, ...(phone ? { phone } : {}) },
      ...(types.length ? { target_seller_types: types } : {}),
      ...(shopCodes.length ? { target_shop_codes: shopCodes } : {}),
    },
  };
}

export type CampaignOverview = { form: CampaignForm; status: string; counts: { approved: number; pending: number; declined: number } };

/** One campaign for the edit form, with how many shop products are approved, waiting for review and declined. */
export async function campaignOverview(campaignId: string): Promise<{ ok: true; data: CampaignOverview } | { ok: false; error: string }> {
  const s = await storedSessions().partner();
  const [d, approved, pending, declined] = await Promise.all([
    getCampaignDetail(s.token, s.cipher, campaignId),
    listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "APPROVED", pageSize: 1 }),
    listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "PENDING", pageSize: 1 }),
    listCampaignProducts(s.token, s.cipher, campaignId, { reviewStatus: "REJECTED", pageSize: 1 }),
  ]);
  if (d.code !== 0 || !d.data) return { ok: false, error: `TikTok didn't send the campaign (${d.code}: ${d.message}).` };
  const c = d.data;
  const count = (r: typeof approved) => (r.code === 0 ? (r.data?.total_count ?? r.data?.products?.length ?? 0) : 0);
  return {
    ok: true,
    data: {
      status: c.status,
      counts: { approved: count(approved), pending: count(pending), declined: count(declined) },
      form: {
        name: c.name ?? "", description: c.description ?? "",
        regEnd: toDay(c.registration_end_time), start: toDay(c.campaign_start_time), end: toDay(c.campaign_end_time),
        commission: (c.commission_rate ?? 0) / 100,
        local: !!c.target_seller_types?.includes("LOCAL"), crossBorder: !!c.target_seller_types?.includes("CROSS_BORDER"),
        shopCodes: (c.target_shops ?? []).map((x) => x.shop_code ?? "").filter(Boolean),
        whatsapp: c.contact_info?.whatsapp ?? "", email: c.contact_info?.email ?? "", phone: c.contact_info?.phone ?? "",
        startAt: c.campaign_start_time ?? null,
      },
    },
  };
}

const failure = (what: string, r: { code: number; message: string }) =>
  r.code === 105005 || /scope|permission/i.test(r.message)
    ? `TikTok refused to ${what}: Rezekii's "Manage Affiliate Partner Campaigns" permission is off, or Techwide's partner account needs to sign in to Rezekii again.`
    : `TikTok didn't ${what} (${r.code}: ${r.message}).`;

/**
 * The fields that differ from the campaign as TikTok has it (TikTok's edit takes only the fields sent). The two end times go
 * together: TikTok checks the registration end against the campaign end (sending only a new campaign end was refused).
 */
export function changedFields(next: CampaignFields, was: CampaignFields): Partial<CampaignFields> {
  const out = Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(was[k as keyof CampaignFields]))) as Partial<CampaignFields>;
  if (out.campaign_end_time !== undefined || out.registration_end_time !== undefined) Object.assign(out, { campaign_end_time: next.campaign_end_time, registration_end_time: next.registration_end_time });
  return out;
}

/** Creates (no `campaignId`) or edits a campaign. A new campaign stays hidden from shops until it is published. */
export async function saveCampaign(form: CampaignForm, campaignId: string | null, actor: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const now = Date.now();
  // An edit measures TikTok's limits from the campaign's real start time, as TikTok has it.
  const cur = campaignId ? await campaignOverview(campaignId) : null;
  const v = campaignFields({ ...form, startAt: cur?.ok ? cur.data.form.startAt : null }, now, !campaignId);
  if (!v.ok) return v;
  const s = await storedSessions().partner();
  if (campaignId) {
    // Only what changed: e.g. a running campaign's start (already passed) isn't sent again, which TikTok would refuse.
    const was = cur?.ok ? campaignFields(cur.data.form, now, false) : null;
    const fields = was?.ok ? changedFields(v.fields, was.fields) : v.fields;
    if (!Object.keys(fields).length) return { ok: true, id: campaignId };
    const r = await editCampaign(s.token, s.cipher, campaignId, fields);
    if (r.code !== 0) return { ok: false, error: failure("save the changes", r) };
    await logActivity(actor, "TAP", `edited the TAP campaign ${v.fields.name}`);
    return { ok: true, id: campaignId };
  }
  const r = await createCampaign(s.token, s.cipher, v.fields);
  if (r.code !== 0 || !r.data?.campaign_id) return { ok: false, error: failure("create the campaign", r) };
  await logActivity(actor, "TAP", `created the TAP campaign ${v.fields.name} (not published yet)`);
  return { ok: true, id: r.data.campaign_id };
}

/** Publishes a campaign so shops can see it and register products. */
export async function publish(campaignId: string, name: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const s = await storedSessions().partner();
  const r = await publishCampaign(s.token, s.cipher, campaignId);
  if (r.code !== 0) return { ok: false, error: failure("publish the campaign", r) };
  await logActivity(actor, "TAP", `published the TAP campaign ${name.slice(0, 60)}`);
  return { ok: true };
}
