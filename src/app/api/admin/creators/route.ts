import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { setAutoApprove } from "@/modules/creator-accounts/access.ts";

export const dynamic = "force-dynamic";

/** "Approve new creators automatically": { auto: true | false } (admins only). */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { auto } = (await req.json().catch(() => ({}))) as { auto?: boolean };
  await setAutoApprove(!!auto, user.id, actorName(user.email));
  return NextResponse.json({ ok: true, auto: !!auto });
}
