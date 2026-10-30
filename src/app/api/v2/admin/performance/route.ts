import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { merchantPerformance } from "@/modules/admin/merchant-performance.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Merchants in one campaign with their results (admins only): ?campaign=<id>. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("campaign") ?? "";
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
  try {
    return NextResponse.json(await merchantPerformance(id), { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[performance]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop didn't answer. Please try again." }, { status: 502 });
  }
}
