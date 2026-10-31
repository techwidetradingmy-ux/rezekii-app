import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getProduct } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const product = await getProduct((await ctx.params).id);
  if (!product) return NextResponse.json({ error: "This product is no longer in the Marketplace." }, { status: 404 });
  // Kept 30 minutes in her browser (owner, 1 Nov 2026): the catalog changes once a day.
  return NextResponse.json({ product }, { headers: { "cache-control": "private, max-age=1800" } });
}
