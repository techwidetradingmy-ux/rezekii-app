import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { setDraftHidden } from "@/modules/admin/tap.ts";

export const dynamic = "force-dynamic";

/** Hide a draft campaign from Rezekii's TAP list, or show it again (admins only): { hide }. TikTok keeps the campaign. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  const { hide } = (await req.json().catch(() => ({}))) as { hide?: boolean };
  await setDraftHidden(id, hide !== false, actorName(user.email));
  return NextResponse.json({ ok: true });
}
