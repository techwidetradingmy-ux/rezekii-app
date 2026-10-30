import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { commissionRaises, rezekiiMatches, takeRaises } from "@/modules/tap/raises.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Products in the creator's showcase that pay more through Techwide's TAP campaign (Today's commission-raise section), and
 * `matches`: every showcase product also in the Rezekii Marketplace not added through Rezekii (Levels). `linked`: false
 * without a TikTok Shop link.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const [raises, matches] = [await commissionRaises(user.id), await rezekiiMatches(user.id)];
  return NextResponse.json({ raises: raises ?? [], matches: matches ?? [], linked: raises !== null }, { headers: { "cache-control": "private, no-store" } });
}

/** Bulk Add to Showcase through Techwide's TAP link: { productIds }. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productIds } = (await req.json().catch(() => ({}))) as { productIds?: unknown };
  if (!Array.isArray(productIds) || !productIds.length) return NextResponse.json({ error: "Choose at least one product." }, { status: 400 });
  const r = await takeRaises(user.id, productIds.map(String));
  return NextResponse.json({ ...r, raises: (await commissionRaises(user.id)) ?? [], matches: (await rezekiiMatches(user.id)) ?? [] });
}
