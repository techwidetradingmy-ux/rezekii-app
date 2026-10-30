import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { productAdmin } from "@/modules/admin/product-admin.ts";

export const dynamic = "force-dynamic";

/** One product for the admin Product page (admins only): ?id=<TikTok product id>. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const d = await productAdmin(req.nextUrl.searchParams.get("id") ?? "", await approvedCreatorToken(user.id));
  return d ? NextResponse.json(d, { headers: { "cache-control": "private, no-store" } }) : NextResponse.json({ error: "We couldn't find this product." }, { status: 404 });
}
