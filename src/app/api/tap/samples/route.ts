import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { myTapRows } from "@/modules/tap/mytap.ts";
import { mySamples, sampleLink, sellerSamples } from "@/modules/tap/samples.ts";

export const dynamic = "force-dynamic";

/** The creator's Rezekii sample requests; with ?from=seller, the samples they asked sellers for directly in TikTok Shop. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const headers = { "cache-control": "private, no-store" };
  if (req.nextUrl.searchParams.get("from") === "seller") {
    // Samples through Techwide's TAP campaigns already show in My TAP products; the rest came from sellers.
    const { rows } = await myTapRows(user.id, user.tiktok_username);
    const tap = new Set(rows.filter((r) => r.stage !== 0 || r.request).map((r) => r.productId));
    return NextResponse.json({ samples: await sellerSamples(user.id, tap) }, { headers });
  }
  return NextResponse.json({ requests: await mySamples(user.id) }, { headers });
}

/**
 * Request a free sample through Techwide's TAP campaign: returns TikTok's one-time link to its sample request page, and the
 * Rezekii address that makes a fresh link on the creator's phone (for the QR code on a computer).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!productId) return NextResponse.json({ error: "Choose a product." }, { status: 400 });
  const r = await sampleLink(user.id, productId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ deeplink: r.deeplink, phoneUrl: `${req.nextUrl.origin}/sample/${productId}`, addedToShowcase: r.addedToShowcase }, { headers: { "cache-control": "private, no-store" } });
}
