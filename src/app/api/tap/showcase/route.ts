import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { addToShowcase, showcaseSummary } from "@/modules/tap/showcase.ts";

export const dynamic = "force-dynamic";

/** Whether + Showcase adds straight to TikTok Shop ({ linked }), and with ?count=1 the showcase totals. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (req.nextUrl.searchParams.get("count") === "1") return NextResponse.json(await showcaseSummary(user.id));
  return NextResponse.json({ linked: (await accessFor(user.id))?.status === "approved" });
}

/** + Showcase for one product: { productId }. Added straight away for approved creators, otherwise a TAP link to open. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!productId || !/^\d{6,25}$/.test(productId)) return NextResponse.json({ error: "This product is no longer in the Marketplace." }, { status: 404 });
  const r = await addToShowcase(user.id, productId);
  return r.added ? NextResponse.json({ added: true }) : NextResponse.json({ added: false, link: r.link, error: r.error }, { status: r.link ? 200 : r.status });
}
