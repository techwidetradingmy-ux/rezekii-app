import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getProduct } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const product = await getProduct((await ctx.params).id);
  if (!product) return NextResponse.json({ error: "This product is no longer in a Techwide TAP campaign." }, { status: 404 });
  return NextResponse.json({ product }, { headers: { "cache-control": "private, max-age=60" } });
}
