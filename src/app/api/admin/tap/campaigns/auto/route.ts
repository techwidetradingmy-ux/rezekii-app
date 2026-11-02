import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, logActivity } from "@/modules/admin/admins.ts";
import { autoExtendOn, endingCampaigns, setAutoExtend } from "@/modules/admin/campaign-watch.ts";

export const dynamic = "force-dynamic";

/** Whether campaigns ending within 90 days are extended automatically each morning, and which ones those are (admins only; owner, 2 Nov 2026). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const [on, ending] = await Promise.all([autoExtendOn(), endingCampaigns()]);
  return NextResponse.json({ on, ending }, { headers: { "cache-control": "private, no-store" } });
}

/** { on } turns automatic extending on or off. */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { on } = (await req.json().catch(() => ({}))) as { on?: unknown };
  if (typeof on !== "boolean") return NextResponse.json({ error: "Say on or off." }, { status: 400 });
  await setAutoExtend(on);
  await logActivity(actorName(user.email), "TAP", on ? "turned on automatic extending of TAP campaigns" : "turned off automatic extending of TAP campaigns");
  return NextResponse.json({ ok: true });
}
