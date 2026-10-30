import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { shopProducts } from "@/modules/marketplace/shop-products.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The seller's real products for Shop Products and Submit Products (owner, 30 Oct 2026). `linked`: false when this account
 * has no Seller Center shop authorized.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const shop = await shopProducts(user);
    return NextResponse.json(shop ? { linked: true, ...shop } : { linked: false }, { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[seller] products failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't reach TikTok Shop. Please try again." }, { status: 502 });
  }
}
