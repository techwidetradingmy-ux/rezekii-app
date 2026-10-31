import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { removeShowcaseProducts } from "@/integrations/tiktok-shop/creator.ts";

export const dynamic = "force-dynamic";

/**
 * Remove from showcase for real (owner, 31 Oct 2026): TikTok's Remove Showcase Products takes the products out of her showcase.
 * Body: { productIds: string[] } (up to 200). She confirms in the app first.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { productIds?: unknown } | null;
  const ids = Array.isArray(body?.productIds) ? body.productIds.filter((x): x is string => typeof x === "string" && /^\d{10,21}$/.test(x)).slice(0, 200) : [];
  if (!ids.length) return NextResponse.json({ error: "Pick a product to remove." }, { status: 400 });
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ error: "Connect your TikTok Shop first." }, { status: 400 });
  const r = await removeShowcaseProducts(token, ids).catch(() => null);
  if (!r) return NextResponse.json({ error: "Couldn't reach TikTok Shop. Please try again." }, { status: 502 });
  const inner = r.data?.code;
  if (r.code !== 0 || (inner !== undefined && inner !== 0)) return NextResponse.json({ error: `TikTok didn't remove it: ${r.data?.message || r.message}` }, { status: 502 });
  return NextResponse.json({ removed: ids });
}
