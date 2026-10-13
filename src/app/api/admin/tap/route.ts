import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { campaignProducts } from "@/modules/admin/tap.ts";

export const dynamic = "force-dynamic";

/** One TAP campaign's products for the admin TAP page (admins only). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("campaign") ?? "";
  if (!/^[\w-]{1,40}$/.test(id)) return NextResponse.json({ error: "Pick a campaign." }, { status: 400 });
  return NextResponse.json({ products: await campaignProducts(id) }, { headers: { "cache-control": "private, no-store" } });
}
