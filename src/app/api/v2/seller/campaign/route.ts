import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { sellerAccessFor } from "@/modules/marketplace/seller-connection.ts";
import { shopCampaignState } from "@/modules/marketplace/shop-campaign.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The shop's own Techwide campaign (owner, 31 Oct 2026): sellers register products in it once, in Seller Center. This reads the
 * campaign and where each of the shop's registered products is (waiting for Techwide, approved or declined), from TikTok.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const access = await sellerAccessFor(user).catch(() => null);
  if (!access) return NextResponse.json({ linked: false });
  const st = await shopCampaignState(access.shop).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : "Couldn't reach TikTok Shop." }));
  if (!st.ok) return NextResponse.json({ linked: true, shop: access.shop.name, error: st.error });
  return NextResponse.json({ linked: true, shop: access.shop.name, campaign: st.campaign, products: st.products }, { headers: { "cache-control": "private, no-store" } });
}
