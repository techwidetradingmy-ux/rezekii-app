import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { makeTapLink } from "@/modules/tap/links.ts";

export const dynamic = "force-dynamic";

/**
 * A TAP promotion link for one product (made with Techwide's partner account, so no creator sign-in is needed).
 * The creator opens it in TikTok Shop and adds the product to their showcase there. The rate follows the creator's level.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!productId || !/^\d{6,25}$/.test(productId)) return NextResponse.json({ error: "This product is no longer in a Techwide TAP campaign." }, { status: 404 });
  const r = await makeTapLink(user.id, productId);
  return r.ok ? NextResponse.json({ link: r.link }) : NextResponse.json({ error: r.error }, { status: r.status });
}
