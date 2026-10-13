import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getProduct } from "@/modules/tap/catalog.ts";
import { makeTapLink, resolveProductId } from "@/modules/tap/links.ts";

export const dynamic = "force-dynamic";

export type ConvertRow = { input: string; kind: "tap" | "shop" | "bad" | "error"; name: string | null; link: string | null; note: string };

/**
 * Pasted TikTok product links (up to 5). Products in Techwide's TAP campaigns get a TAP link right away. Other products need
 * the creator's own TikTok Shop connection for an affiliate link, which turns on once TikTok approves it.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { links } = (await req.json().catch(() => ({}))) as { links?: unknown };
  const lines = (Array.isArray(links) ? links : []).filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim().slice(0, 500)).slice(0, 5);
  if (!lines.length) return NextResponse.json({ error: "Paste at least one product link." }, { status: 400 });
  const rows: ConvertRow[] = [];
  for (const input of lines) {
    const id = await resolveProductId(input);
    if (!id) {
      rows.push({ input, kind: "bad", name: null, link: null, note: "Not a TikTok Shop product link" });
      continue;
    }
    const product = await getProduct(id);
    if (!product) {
      rows.push({ input, kind: "shop", name: null, link: null, note: "Needs your TikTok Shop connection" });
      continue;
    }
    const r = await makeTapLink(user.id, id);
    rows.push(r.ok ? { input, kind: "tap", name: product.name, link: r.link, note: "TAP" } : { input, kind: "error", name: product.name, link: null, note: r.error });
  }
  return NextResponse.json({ rows });
}
