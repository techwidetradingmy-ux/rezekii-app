import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { removeTeamAccount } from "@/modules/admin/accounts.ts";
import { actorName } from "@/modules/admin/admins.ts";

export const dynamic = "force-dynamic";

/** Removes one of Techwide's own TikTok accounts from Rezekii (admins only). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ openId: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const r = await removeTeamAccount(decodeURIComponent((await params).openId), actorName(user.email));
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 409 });
}
