import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { workbench } from "@/modules/admin/workbench.ts";

export const dynamic = "force-dynamic";

/** The signed-in staff member's own links, invites and merchants (admins only). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json(await workbench(user, actorName(user.email), req.nextUrl.origin), { headers: { "cache-control": "private, no-store" } });
}
