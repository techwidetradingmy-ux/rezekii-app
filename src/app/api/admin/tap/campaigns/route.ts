import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { saveCampaign, type CampaignForm } from "@/modules/admin/campaigns.ts";

export const dynamic = "force-dynamic";

/** Create a TAP campaign (admins only). It stays hidden from shops until it is published. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const form = (await req.json().catch(() => null)) as CampaignForm | null;
  if (!form || typeof form.name !== "string") return NextResponse.json({ error: "Fill in the campaign." }, { status: 400 });
  const r = await saveCampaign(form, null, actorName(user.email));
  return r.ok ? NextResponse.json({ id: r.id }) : NextResponse.json({ error: r.error }, { status: 400 });
}
