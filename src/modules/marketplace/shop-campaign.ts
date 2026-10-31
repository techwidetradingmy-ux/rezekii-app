import { getCampaignDetail, listCampaignProducts, type CampaignProduct, type ProductReviewStatus } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { ensureSellerCampaign } from "../tap/pipeline.ts";
import { REASON_TEXT, noteSeenDecisions } from "../tap/reviews.ts";

export type Registered = { id: string; name: string; image: string | null; status: "pending" | "approved" | "declined"; totalRate: number | null; openRate: number | null; reason: string | null };
export type ShopCampaign = { id: string; name: string; status: string | null; commission: number | null; end: number | null; registerEnd: number | null };

/**
 * The shop's own Techwide campaign and the shop's products registered in it (owner, 31 Oct 2026), straight from TikTok. The
 * campaign is public, so other shops can register too; only this shop's products are returned.
 */
export async function shopCampaignState(shop: { id: string; name: string }): Promise<{ ok: true; campaign: ShopCampaign; products: Registered[] } | { ok: false; error: string }> {
  const own = await ensureSellerCampaign(shop.id);
  if (!own.ok) return own;
  const s = await storedSessions().partner();
  const list = async (status: ProductReviewStatus) => {
    const out: CampaignProduct[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const r = await listCampaignProducts(s.token, s.cipher, own.campaignId, { reviewStatus: status, pageSize: 50, pageToken });
      if (r.code !== 0) break;
      out.push(...(r.data?.products ?? []));
      pageToken = r.data?.next_page_token || undefined;
      if (!pageToken) break;
    }
    return out;
  };
  const [d, pending, approved, declined] = await Promise.all([getCampaignDetail(s.token, s.cipher, own.campaignId), list("PENDING"), list("APPROVED"), list("REJECTED")]);
  const mine = (p: CampaignProduct) => !p.shop_name || p.shop_name.trim().toLowerCase() === shop.name.trim().toLowerCase();
  const products = ([[pending, "pending"], [approved, "approved"], [declined, "declined"]] as const).flatMap(([rows, status]) =>
    rows.filter(mine).map((p): Registered => ({ id: p.id, name: p.name, image: p.main_image_url ?? null, status, totalRate: p.total_commission_rate ?? null, openRate: p.open_collaboration_commission_rate ?? null, reason: null })),
  );
  // Decisions made in Partner Center are noted here too, so the shop is told; Rezekii's own carry the reason.
  const latest = await noteSeenDecisions(own.campaignId, shop.id, products).catch(() => new Map());
  for (const p of products) if (p.status === "declined") { const r = latest.get(p.id)?.reason; p.reason = r ? REASON_TEXT[r] ?? r : null; }
  const c = d.code === 0 ? d.data : null;
  return {
    ok: true,
    campaign: { id: own.campaignId, name: c?.name ?? `Techwide X ${shop.name}`, status: c?.status ?? null, commission: c?.commission_rate != null ? c.commission_rate / 100 : null, end: c?.campaign_end_time ?? null, registerEnd: c?.registration_end_time ?? null },
    products,
  };
}
