import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { addToShowcase, showcaseSummary } from "@/modules/tap/showcase.ts";
import { REFUSED, noteRefused } from "@/modules/tap/raises.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Whether + Showcase adds straight to TikTok Shop ({ linked }), and with ?count=1 the showcase totals (saved; &fresh=1 reads TikTok again). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (req.nextUrl.searchParams.get("count") === "1") return NextResponse.json(await showcaseSummary(user.id, req.nextUrl.searchParams.get("fresh") === "1"), { headers: { "cache-control": "private, no-store" } });
  return NextResponse.json({ linked: (await accessFor(user.id))?.status === "approved" });
}

/**
 * + Showcase for one product: { productId }. Added straight away for approved creators, otherwise a TAP link to open. When TikTok
 * refuses it (owner, 2 Nov 2026), TikTok's reason comes back in plain words instead of the link, and a refusal is kept like a
 * bulk add's, so the product leaves her offers.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!productId || !/^\d{6,25}$/.test(productId)) return NextResponse.json({ error: "This product is no longer in the Marketplace." }, { status: 404 });
  const r = await addToShowcase(user.id, productId);
  if (r.added) return NextResponse.json({ added: true, already: !!r.already });
  if (r.link && !r.error) return NextResponse.json({ added: false, link: r.link });
  const refused = REFUSED.test(r.error ?? "");
  if (refused) await noteRefused(user.id, [productId]).catch(() => undefined);
  return NextResponse.json({ added: false, refused, error: refused ? "TikTok won't add this product to your showcase." : r.error || "TikTok Shop didn't add it. Please try again." }, { status: r.status });
}
