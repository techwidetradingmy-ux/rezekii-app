import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { adminTodayV2 } from "@/modules/admin/today-v2.ts";

export const dynamic = "force-dynamic";

/** The admin Today page (admins only; owner, 31 Oct 2026: real data). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json(await adminTodayV2(actorName(user.email)), { headers: { "cache-control": "private, no-store" } });
}
