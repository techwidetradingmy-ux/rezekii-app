import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { pendingProducts, REJECT_REASONS } from "@/modules/admin/tap.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Product Review (owner, 31 Oct 2026): every product shops registered in their own Techwide campaign that waits for Techwide,
 * read from TikTok. Approve or decline goes through /api/admin/tap/review (TikTok's review API), with the reason the shop sees.
 */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const shops = (await (await supabaseRest("seller_connections?campaign_id=not.is.null&select=shop_name,campaign_id&order=shop_name")).json()) as { shop_name: string; campaign_id: string }[];
  const lists = await Promise.all(shops.map(async (s) => {
    try {
      const { products } = await pendingProducts(s.campaign_id);
      return { shop: s.shop_name, campaignId: s.campaign_id, products, error: null as string | null };
    } catch (err) {
      return { shop: s.shop_name, campaignId: s.campaign_id, products: [], error: err instanceof Error ? err.message : "TikTok didn't answer." };
    }
  }));
  return NextResponse.json({ shops: lists, reasons: REJECT_REASONS }, { headers: { "cache-control": "private, no-store" } });
}
