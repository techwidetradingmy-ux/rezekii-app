import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { myTapRows } from "@/modules/tap/mytap.ts";
import { sellerSamples } from "@/modules/tap/samples.ts";
import { sampleStage } from "@/modules/tap/stages.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Her free samples (owner, 31 Oct 2026: real data): Techwide TAP samples with TikTok's own step (and ones asked for on Rezekii that
 * TikTok hasn't shown yet), plus samples she asked sellers for directly. Stage: -1 not approved, 1 applied, 2 approved, 3 shipped,
 * 4 received (waiting for her video), 5 done.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { rows } = await myTapRows(user.id, user.tiktok_username).catch(() => ({ rows: [] as Awaited<ReturnType<typeof myTapRows>>["rows"] }));
  const tap = rows.filter((r) => r.stage !== 0 || r.request);
  const fromSellers = await sellerSamples(user.id, new Set(tap.map((r) => r.productId))).catch(() => []);
  const samples = [
    ...tap.map((r) => ({
      id: r.key, productId: r.productId, name: r.name, shop: r.shop, image: r.image, stage: r.stage || 1, videos: r.videos, via: "Techwide TAP",
      note: r.request?.noSample ? "This product has no free samples left." : r.request && !r.request.tiktok && r.stage === 0 ? "Not submitted in TikTok yet" : r.request?.note ?? null,
    })),
    ...fromSellers.map((s) => ({ id: s.id, productId: s.productId, name: s.name, shop: s.shop, image: s.image, stage: sampleStage(s.status) || 1, videos: 0, via: "From the seller", note: null })),
  ];
  return NextResponse.json({ samples }, { headers: { "cache-control": "private, no-store" } });
}
