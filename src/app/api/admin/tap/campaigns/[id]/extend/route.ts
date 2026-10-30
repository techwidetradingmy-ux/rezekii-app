import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { extendCampaign } from "@/modules/admin/campaigns.ts";

export const dynamic = "force-dynamic";

/** Extends one campaign to the latest end day TikTok allows (admins only). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  const r = await extendCampaign(id, actorName(user.email));
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
