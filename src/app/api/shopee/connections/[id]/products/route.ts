import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { shopeeShopItems } from "@/integrations/shopee/products.ts";
import { freshShopToken, getShopee, RECONNECT_SHOP, RECONNECT_SHOPEE } from "@/modules/shopee/connections.ts";

export const dynamic = "force-dynamic";

/** A connected shop's live products for New post, read from Shopee each time (nothing is kept). Shops only. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const c = /^[0-9a-f-]{36}$/.test(id) ? await getShopee(id, user.id) : null;
  if (!c) return NextResponse.json({ error: "That channel isn't connected." }, { status: 404 });
  if (c.role !== "seller" || !c.shop_id) return NextResponse.json({ error: "Only a shop has its own products." }, { status: 400 });
  try {
    return NextResponse.json({ items: await shopeeShopItems(await freshShopToken(c), c.shop_id) });
  } catch (err) {
    const reconnect = err instanceof Error && (err.message === RECONNECT_SHOPEE || err.message === RECONNECT_SHOP);
    console.error("[shopee] products failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: reconnect ? (err as Error).message : "Couldn't load the shop's products from Shopee. Try again." }, { status: reconnect ? 409 : 502 });
  }
}
