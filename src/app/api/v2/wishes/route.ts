import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { board, findProduct, findProductCached, myWishes, saveWish, wantedOne, type Commit } from "@/modules/wishes/wishes.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Wish list (owner, 31 Oct 2026: real storage). ?part=mine: her wishes. ?part=board: products creators want on Rezekii.
 * ?part=product&id=: one product that isn't on Rezekii, with its board numbers.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const part = q.get("part");
  if (part === "mine") return NextResponse.json({ wishes: await myWishes(user.id) }, NO_STORE);
  if (part === "board") return NextResponse.json({ items: await board() }, NO_STORE);
  if (part === "product") {
    const id = q.get("id") ?? "";
    // The board, her sign-in and TikTok's facts (kept 30 minutes) at the same time (owner, 1 Nov 2026).
    const [wanted, token] = await Promise.all([wantedOne(id), approvedCreatorToken(user.id)]);
    if (wanted) return NextResponse.json({ product: wanted, onRezekii: false, wanted }, NO_STORE);
    const found = await findProductCached(token, id);
    if ("error" in found) return NextResponse.json(found, { status: 404 });
    return NextResponse.json({ ...found, wanted: null }, NO_STORE);
  }
  return NextResponse.json({ error: "Say which part." }, { status: 400 });
}

/** { find: link } finds a pasted TikTok Shop product; { productId, commit } saves her wish for it. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { find?: unknown; productId?: unknown; commit?: Commit };
  const token = await approvedCreatorToken(user.id);
  if (typeof body.find === "string") {
    if (!body.find.trim()) return NextResponse.json({ error: "Paste a TikTok Shop product link first." }, { status: 400 });
    const found = await findProduct(token, body.find);
    if ("error" in found) return NextResponse.json(found, { status: 404 });
    return NextResponse.json({ ...found, wanted: found.onRezekii ? null : await wantedOne(found.product.id) });
  }
  if (typeof body.productId !== "string" || !body.commit) return NextResponse.json({ error: "Say which product and what you'll give." }, { status: 400 });
  const r = await saveWish(user.id, token, body.productId, body.commit);
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
