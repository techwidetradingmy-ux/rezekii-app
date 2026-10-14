import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { publish } from "@/modules/admin/campaigns.ts";

export const dynamic = "force-dynamic";

/** Publish a campaign so shops can see it (admins only): { name }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const r = await publish(id, String(name ?? id), actorName(user.email));
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 502 });
}
