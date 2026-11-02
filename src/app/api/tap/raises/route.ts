import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { showcaseScan, takeRaises } from "@/modules/tap/raises.ts";
import { getLang, tFor } from "@/lib/i18n/server";
import { errorLine } from "@/modules/posting/errors.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Products in the creator's showcase that pay more through Techwide's TAP campaign (Today's commission-raise section), and
 * `matches`: every showcase product also in the Rezekii Marketplace not added through Rezekii (Levels). Her last scan, and when
 * it ran (`at`, null before her first); ?scan=1 scans her showcase on TikTok now (owner, 2 Nov 2026: only when she taps Scan).
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const s = await showcaseScan(user.id, req.nextUrl.searchParams.get("scan") === "1");
  return NextResponse.json({ raises: s?.raises ?? [], matches: s?.matches ?? [], at: s?.at ?? null, count: s?.count ?? null }, { headers: { "cache-control": "private, no-store" } });
}

/** Bulk Add to Showcase through Techwide's TAP link: { productIds }. The saved scan without what was added. */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const { productIds } = (await req.json().catch(() => ({}))) as { productIds?: unknown };
  if (!Array.isArray(productIds) || !productIds.length) return NextResponse.json({ error: t("Choose at least one product.") }, { status: 400 });
  const r = await takeRaises(user.id, productIds.map(String));
  const s = await showcaseScan(user.id);
  // Rezekii's own reasons in her language; TikTok's stay as TikTok wrote them.
  return NextResponse.json({ ...r, failed: r.failed.map((f) => ({ ...f, error: errorLine(t, f.error) })), raises: s?.raises ?? [], matches: s?.matches ?? [] });
}
