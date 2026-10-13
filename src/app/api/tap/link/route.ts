import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { campaignProductLink } from "@/integrations/tiktok-shop/partner.ts";
import { creatorRateFor, linkTarget } from "@/modules/tap/catalog.ts";
import { storedSessions } from "@/modules/refresh/sessions.ts";
import { levelOf } from "@/modules/levels/store.ts";

export const dynamic = "force-dynamic";

/**
 * A TAP promotion link for one product (made with Techwide's partner account, so no creator sign-in is needed).
 * The creator opens it in TikTok Shop and adds the product to their showcase there. The rate follows the creator's level.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  const target = productId ? await linkTarget(productId) : null;
  if (!productId || !target) return NextResponse.json({ error: "This product is no longer in a Techwide TAP campaign." }, { status: 404 });
  try {
    const partner = await storedSessions().partner();
    const r = await campaignProductLink(partner.token, partner.cipher, target.campaignId, productId, creatorRateFor(await levelOf(user.id), target.openRate, target.totalRate));
    const link = r.data?.product_promotion_link;
    if (r.code !== 0 || !link) return NextResponse.json({ error: `TikTok could not make the link right now (${r.code}). Please try again.` }, { status: 502 });
    return NextResponse.json({ link });
  } catch (err) {
    console.error("[tap link]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok could not make the link right now. Please try again." }, { status: 502 });
  }
}
