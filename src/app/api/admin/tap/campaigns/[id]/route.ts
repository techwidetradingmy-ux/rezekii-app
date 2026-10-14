import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { campaignOverview, saveCampaign, type CampaignForm } from "@/modules/admin/campaigns.ts";

export const dynamic = "force-dynamic";
const idOk = (id: string) => /^\d{6,25}$/.test(id);

/** One campaign for the edit form, with its product counts by review status (admins only). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  if (!idOk(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  try {
    const r = await campaignOverview(id);
    return r.ok ? NextResponse.json(r.data, { headers: { "cache-control": "private, no-store" } }) : NextResponse.json({ error: r.error }, { status: 502 });
  } catch (err) {
    console.error("[campaign detail]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop didn't answer. Please try again." }, { status: 502 });
  }
}

/** Save changes to a campaign (admins only). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  if (!idOk(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  const form = (await req.json().catch(() => null)) as CampaignForm | null;
  if (!form || typeof form.name !== "string") return NextResponse.json({ error: "Fill in the campaign." }, { status: 400 });
  const r = await saveCampaign(form, id, actorName(user.email));
  return r.ok ? NextResponse.json({ id: r.id }) : NextResponse.json({ error: r.error }, { status: 400 });
}
