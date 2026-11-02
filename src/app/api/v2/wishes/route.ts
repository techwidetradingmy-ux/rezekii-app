import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { board, findProduct, myWishes, saveWish, wantedOne, type Commit } from "@/modules/wishes/wishes.ts";
import { getLang, tFor } from "@/lib/i18n/server";
import { errorLine } from "@/modules/posting/errors.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Wish list (owner, 31 Oct 2026: real storage). ?part=mine: her wishes. ?part=board: products creators want on Rezekii. A product
 * page gets one product's numbers from /api/tap/products/[id] (owner, 2 Nov 2026).
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const part = q.get("part");
  if (part === "mine") return NextResponse.json({ wishes: await myWishes(user.id) }, NO_STORE);
  if (part === "board") return NextResponse.json({ items: await board() }, NO_STORE);
  return NextResponse.json({ error: t("Say which part.") }, { status: 400 });
}

/** { find: link } finds a pasted TikTok Shop product; { productId, commit } saves her wish for it. */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { find?: unknown; productId?: unknown; commit?: Commit };
  const token = await approvedCreatorToken(user.id);
  if (typeof body.find === "string") {
    if (!body.find.trim()) return NextResponse.json({ error: t("Paste a TikTok Shop product link first.") }, { status: 400 });
    const found = await findProduct(token, body.find);
    if ("error" in found) return NextResponse.json({ error: errorLine(t, found.error) }, { status: 404 });
    return NextResponse.json({ ...found, wanted: found.onRezekii ? null : await wantedOne(found.product.id) });
  }
  if (typeof body.productId !== "string" || !body.commit) return NextResponse.json({ error: t("Say which product and what you'll give.") }, { status: 400 });
  const r = await saveWish(user.id, token, body.productId, body.commit);
  return "error" in r ? NextResponse.json({ error: errorLine(t, r.error) }, { status: 400 }) : NextResponse.json(r);
}
