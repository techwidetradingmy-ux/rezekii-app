import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listCampaignProducts, type ProductReviewStatus } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";

export type Decision = "approved" | "declined";
export type Review = { id: string; campaign_id: string; product_id: string; shop_id: string | null; product_name: string | null; decision: Decision; reason: string | null; decided_by: string | null; decided_at: string };

/** The reason a shop sees, for TikTok's reason codes. */
export const REASON_TEXT: Record<string, string> = {
  COMMISSION_TOO_LOW: "Commission too low",
  PRODUCT_HARD_TO_PROMOTE: "Hard to promote",
  PRODUCT_TOO_EXPENSIVE: "Too expensive",
  NO_SUITABLE_CREATOR: "No suitable creator",
};

async function shopOfCampaign(campaignId: string): Promise<string | null> {
  const [row] = (await (await supabaseRest(`seller_connections?campaign_id=eq.${encodeURIComponent(campaignId)}&select=shop_id&limit=1`)).json()) as { shop_id: string }[];
  return row?.shop_id ?? null;
}

/** A decision made in Rezekii (owner, 31 Oct 2026): kept with its reason so the shop is told, with the reason. */
export async function recordReview(campaignId: string, productId: string, name: string | null, decision: Decision, reason: string | null, by: string): Promise<void> {
  await supabaseRest("product_reviews", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ campaign_id: campaignId, product_id: productId, shop_id: await shopOfCampaign(campaignId), product_name: name, decision, reason, decided_by: by }),
  });
}

/** The latest decision on each product in one campaign. */
export async function latestReviews(campaignId: string, productIds: string[]): Promise<Map<string, Review>> {
  const out = new Map<string, Review>();
  for (let i = 0; i < productIds.length; i += 100) {
    const rows = (await (await supabaseRest(`product_reviews?campaign_id=eq.${encodeURIComponent(campaignId)}&product_id=in.(${productIds.slice(i, i + 100).join(",")})&select=*&order=decided_at.desc`)).json()) as Review[];
    for (const r of rows) if (!out.has(r.product_id)) out.set(r.product_id, r);
  }
  return out;
}

/**
 * Decisions made in Partner Center instead of Rezekii (TikTok doesn't share the reason): a product TikTok now lists as approved or
 * declined, whose latest decision here says otherwise, is kept as decided now, so the shop is told.
 */
export async function noteSeenDecisions(campaignId: string, shopId: string, products: { id: string; name: string; status: "pending" | Decision }[]): Promise<Map<string, Review>> {
  const decided = products.filter((p): p is { id: string; name: string; status: Decision } => p.status !== "pending");
  const latest = await latestReviews(campaignId, decided.map((p) => p.id));
  const fresh = decided.filter((p) => latest.get(p.id)?.decision !== p.status);
  if (fresh.length) {
    const rows = (await (await supabaseRest("product_reviews", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(fresh.map((p) => ({ campaign_id: campaignId, product_id: p.id, shop_id: shopId, product_name: p.name, decision: p.status, reason: null, decided_by: "Partner Center" }))),
    })).json()) as Review[];
    for (const r of rows) latest.set(r.product_id, r);
  }
  return latest;
}

/** Every connected shop's campaign, checked for decisions made in Partner Center (run by the timer every 15 minutes). Returns shops checked. */
export async function syncShopReviews(): Promise<number> {
  const shops = (await (await supabaseRest("seller_connections?campaign_id=not.is.null&select=shop_id,shop_name,campaign_id")).json()) as { shop_id: string; shop_name: string; campaign_id: string }[];
  if (!shops.length) return 0;
  const s = await storedSessions().partner();
  let seen = 0;
  for (const shop of shops) {
    const products: { id: string; name: string; status: Decision }[] = [];
    for (const [status, decision] of [["APPROVED", "approved"], ["REJECTED", "declined"]] as [ProductReviewStatus, Decision][]) {
      const r = await listCampaignProducts(s.token, s.cipher, shop.campaign_id, { reviewStatus: status, pageSize: 50 });
      if (r.code !== 0) continue;
      const mine = (r.data?.products ?? []).filter((p) => !p.shop_name || p.shop_name.trim().toLowerCase() === shop.shop_name.trim().toLowerCase());
      products.push(...mine.map((p) => ({ id: p.id, name: p.name, status: decision })));
    }
    await noteSeenDecisions(shop.campaign_id, shop.shop_id, products);
    seen += 1;
  }
  return seen;
}
