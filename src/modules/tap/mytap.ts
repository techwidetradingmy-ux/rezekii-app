import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getSampleTracking, listCreatorContent, listProductCreators, type ProductCreator } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { amount } from "./golden.ts";
import { mySamples, sampleOffered, tiktokSampleStatus } from "./samples.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { normalizeStatus, sampleStage, unixSeconds, type MyTapRow } from "./stages.ts";

type Row = {
  campaign_id: string; product_id: string; username: string; temp_id: string | null; temp_id_at: string | null; affiliate_product_id: string | null;
  paid: number; videos: number; lives: number; sample_status: string | null; product_name: string | null; shop: string | null; image: string | null;
};

/**
 * Everything a creator promotes in Techwide's TAP campaigns (TikTok's data, by their TikTok username), plus the samples they
 * asked for on Rezekii that TikTok's TAP data doesn't show yet. Those take their status from the creator's own TikTok sample
 * requests; with none there, they are "not submitted in TikTok", never a sample status (owner's rule, 14 Oct 2026).
 */
export async function myTapRows(userId: string, username: string | null): Promise<{ rows: MyTapRow[]; asOf: string | null }> {
  const [tiktok, requests] = await Promise.all([
    username
      ? supabaseRest(`tap_creator_products?username=eq.${encodeURIComponent(username.toLowerCase())}&select=campaign_id,product_id,paid,videos,lives,sample_status,product_name,shop,image,as_of&order=paid.desc&limit=2000`).then(
          (r) => r.json() as Promise<(Row & { as_of: string })[]>,
        )
      : Promise.resolve([] as (Row & { as_of: string })[]),
    mySamples(userId),
  ]);
  const rows: MyTapRow[] = tiktok.map((r) => ({
    key: `${r.campaign_id}:${r.product_id}`, campaignId: r.campaign_id, productId: r.product_id, name: (r.product_name ?? "").trim(), shop: r.shop ?? "", image: r.image,
    stage: sampleStage(normalizeStatus(r.sample_status)), status: r.sample_status, paid: Number(r.paid), videos: r.videos, lives: r.lives,
  }));
  // TikTok's own list of the creator's sample requests is live; the TAP campaign data is read once a day. A sample submitted
  // in TikTok today shows with its live status straight away (owner, 16 Oct 2026), on rows from either source.
  const live = await tiktokSampleStatus(userId);
  for (const r of rows) {
    const st = live.get(r.productId);
    if (st) Object.assign(r, { status: st, stage: sampleStage(normalizeStatus(st)) });
  }
  const onTikTok = new Set(rows.map((r) => r.productId));
  const pending = requests.filter((x) => !onTikTok.has(x.product_id));
  // A request TikTok has no record of: if TikTok offers no sample of that product (none allocated, or none left), say so.
  const token = pending.some((x) => !live.has(x.product_id)) ? await approvedCreatorToken(userId) : null;
  const offered = new Map(await Promise.all(pending.filter((x) => token && !live.has(x.product_id)).map(async (x) => [x.product_id, await sampleOffered(token!, x.product_id)] as const)));
  const asked: MyTapRow[] = pending.map((x) => {
    const st = live.get(x.product_id) ?? null;
    return {
      key: `rz:${x.id}`, campaignId: null, productId: x.product_id, name: x.product_name, shop: x.shop ?? "", image: x.image,
      stage: st ? sampleStage(normalizeStatus(st)) : x.status === "rejected" ? -1 : 0,
      paid: 0, videos: 0, lives: 0, request: { status: x.status, note: x.note, createdAt: x.created_at, updatedAt: x.updated_at, tiktok: st, noSample: offered.get(x.product_id) === false },
    };
  });
  return { rows: [...asked, ...rows], asOf: tiktok.reduce<string | null>((m, r) => (!m || r.as_of > m ? r.as_of : m), null) };
}

export type MyTapDetail = {
  carrier: string;
  eta: number;
  /** [description, unix seconds], newest first */
  events: [string, number][];
  /** [VIDEO | LIVE_ROOM, unix seconds, views, orders, RM paid] */
  content: [string, number, number, number, number][];
};

/** TikTok's creator id for a product lasts about an hour; a fresh one is found by paging the product's creators. */
async function creatorEntry(token: string, cipher: string, row: Row): Promise<ProductCreator | null> {
  if (row.temp_id && row.temp_id_at && Date.now() - Date.parse(row.temp_id_at) < 50 * 60_000)
    return { affiliate_product_id: row.affiliate_product_id ?? row.product_id, creator: { creator_temp_id: row.temp_id, user_name: row.username } };
  let pageToken: string | undefined;
  for (let page = 0; page < 40; page++) {
    const r = await listProductCreators(token, cipher, row.campaign_id, row.product_id, { pageSize: 50, pageToken });
    if (r.code !== 0) return null;
    const hit = (r.data?.promotion_creators ?? []).find((c) => c.creator?.user_name?.toLowerCase() === row.username);
    if (hit) {
      await supabaseRest(`tap_creator_products?campaign_id=eq.${row.campaign_id}&product_id=eq.${row.product_id}&username=eq.${encodeURIComponent(row.username)}`, {
        method: "PATCH",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ temp_id: hit.creator.creator_temp_id, temp_id_at: new Date().toISOString(), affiliate_product_id: hit.affiliate_product_id ?? null }),
      });
      return hit;
    }
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) return null;
  }
  return null;
}

/** Sample tracking and the creator's videos and LIVEs for one product, read from TikTok when the creator opens it. */
export async function myTapDetail(username: string, campaignId: string, productId: string): Promise<MyTapDetail | null> {
  if (!/^\d{6,25}$/.test(campaignId) || !/^\d{6,25}$/.test(productId)) return null;
  const [row] = (await (await supabaseRest(
    `tap_creator_products?campaign_id=eq.${campaignId}&product_id=eq.${productId}&username=eq.${encodeURIComponent(username.toLowerCase())}&select=campaign_id,product_id,username,temp_id,temp_id_at,affiliate_product_id,sample_status&limit=1`,
  )).json()) as Row[];
  if (!row) return null;
  const s = await storedSessions().partner();
  const entry = await creatorEntry(s.token, s.cipher, row);
  if (!entry) return { carrier: "", eta: 0, events: [], content: [] };
  const wantsTracking = sampleStage(normalizeStatus(row.sample_status)) !== 0;
  const [tracking, videos, lives] = await Promise.all([
    wantsTracking ? getSampleTracking(s.token, s.cipher, campaignId, productId, entry.creator.creator_temp_id) : null,
    listCreatorContent(s.token, s.cipher, campaignId, productId, entry, "VIDEO"),
    listCreatorContent(s.token, s.cipher, campaignId, productId, entry, "LIVE_ROOM"),
  ]);
  const t = tracking?.code === 0 ? tracking.data?.sample_status : undefined;
  const content: MyTapDetail["content"] = [];
  for (const [kind, r] of [["VIDEO", videos], ["LIVE_ROOM", lives]] as const)
    for (const v of r.code === 0 ? (r.data?.creator_content_statistics ?? []) : [])
      content.push([kind, unixSeconds(v.published_date), Number(v.view_count) || 0, Number(v.paid_order_num) || 0, amount(v.paid_amount)]);
  return {
    carrier: t?.shipping_provider_name ?? "",
    eta: unixSeconds(t?.estimated_latest_delivery_date),
    events: (t?.tracking_results ?? []).map((e) => [e.tracking_event_description ?? "", unixSeconds(e.tracking_event_update_date)] as [string, number]).sort((a, b) => b[1] - a[1]),
    content: content.sort((a, b) => b[1] - a[1]),
  };
}
