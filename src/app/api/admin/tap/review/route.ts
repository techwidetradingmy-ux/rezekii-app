import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { REJECT_REASONS, pendingProducts, reviewProduct, type AdminTapProduct } from "@/modules/admin/tap.ts";

export const dynamic = "force-dynamic";
const campaignOk = (id: unknown): id is string => typeof id === "string" && /^[\w-]{1,40}$/.test(id);

/** Products waiting for review in one campaign: ?campaign= (admins only). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("campaign");
  if (!campaignOk(id)) return NextResponse.json({ error: "Pick a campaign." }, { status: 400 });
  try {
    return NextResponse.json(await pendingProducts(id), { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[tap review list]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop didn't answer. Please try again." }, { status: 502 });
  }
}

/** Approve or decline: { campaign, product, name, decision: "approve" | "decline", reason }. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { campaign?: string; product?: string; name?: string; decision?: string; reason?: string; item?: AdminTapProduct };
  if (!campaignOk(b.campaign) || !/^\d{6,25}$/.test(b.product ?? "")) return NextResponse.json({ error: "Which product?" }, { status: 400 });
  const approve = b.decision === "approve";
  const reason = REJECT_REASONS.find(([k]) => k === b.reason)?.[0] ?? null;
  if (!approve && !reason) return NextResponse.json({ error: "Pick a reason the shop will see." }, { status: 400 });
  // The product as the To review list showed it, so the campaign's product list can show it before the daily refresh.
  const item = b.item && typeof b.item === "object" && b.item.id === b.product && typeof b.item.name === "string" ? b.item : null;
  const r = await reviewProduct(b.campaign, b.product!, approve, reason, String(b.name ?? b.product), actorName(user.email), item);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 });
}
