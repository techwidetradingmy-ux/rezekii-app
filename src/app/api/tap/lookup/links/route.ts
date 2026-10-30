import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { logLinks } from "@/modules/tap/links.ts";
import { lookupAffiliateLinks } from "@/modules/tap/convert.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The creator's affiliate link for each looked-up product, for the export: { items: [{ id, name, image }] } (up to 200). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ error: "Link your TikTok Shop to make affiliate links." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { items?: { id?: unknown; name?: unknown; image?: unknown }[] };
  const items = (Array.isArray(body.items) ? body.items : [])
    .filter((x) => typeof x?.id === "string" && /^\d{6,25}$/.test(x.id))
    .slice(0, 200)
    .map((x) => ({ id: x.id as string, name: typeof x.name === "string" ? x.name.slice(0, 200) : null, image: typeof x.image === "string" ? x.image.slice(0, 500) : null }));
  if (!items.length) return NextResponse.json({ error: "No products to make links for." }, { status: 400 });
  try {
    const links = await lookupAffiliateLinks(token, [...new Set(items.map((x) => x.id))]);
    await logLinks(user.id, items.filter((x) => links[x.id]).map((x) => ({ productId: x.id, name: x.name, image: x.image, tag: null, link: links[x.id] })));
    return NextResponse.json({ links });
  } catch (err) {
    console.error("[lookup links]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop did not answer. Please try again." }, { status: 502 });
  }
}
