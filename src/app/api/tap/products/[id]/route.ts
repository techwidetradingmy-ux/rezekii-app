import { NextResponse, after, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { getProduct, withSampleOffers } from "@/modules/tap/catalog.ts";
import { herOffers } from "@/modules/tap/for-creator.ts";
import { askFacts, saveFacts, savedFacts } from "@/modules/tap/product-facts.ts";
import { sampleOffers } from "@/modules/tap/samples.ts";
import { wantedOne } from "@/modules/wishes/wishes.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * One product page in one answer (owner, 2 Nov 2026):
 * - `product`: in Rezekii's Marketplace now, with the free sample as the Marketplace shows it to her (her own TikTok check);
 *   null when it isn't in the Marketplace (any more).
 * - `facts`: TikTok's rating and main and sub category, and `open` its open plan rate (×100; Rezekii's own when it has one).
 *   Asked from TikTok once for this product, then kept a day on the server.
 * - `off`: a product not on Rezekii, as TikTok lists it, with the wish list numbers for this product alone. Rezekii products
 *   skip the wish list.
 * - `refused`: TikTok refused to add it to her showcase in the last 30 days.
 * Read fresh on every open (not kept in her browser), so a product that left the Marketplace says so straight away.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = (await ctx.params).id;
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Couldn't find this product.", product: null }, { status: 404 });
  // Her sign-in is read alongside, in case TikTok has to be asked.
  const token = approvedCreatorToken(user.id).catch(() => null);
  const [tap, her, saved] = await Promise.all([getProduct(id), herOffers(user.id), savedFacts(id).catch(() => null)]);
  const [asked, wanted, general] = await Promise.all([
    saved ? null : token.then((t) => (t ? askFacts(t, id) : null)),
    tap ? null : wantedOne(id).catch(() => null),
    tap && !her.offers && tap.samples > 0 ? sampleOffers().catch(() => ({})) : null,
  ]);
  if (asked) after(() => saveFacts(id, asked).catch((err) => console.error("[product facts]", err instanceof Error ? err.message : err)));
  const facts = saved ?? asked;
  const open = tap?.openRate ?? facts?.openRate ?? null;
  if (!tap && !facts) return NextResponse.json({ error: "Couldn't find this product.", product: null }, { status: 404, ...NO_STORE });
  // The same free sample as the Marketplace (owner, 2 Nov 2026): her own check, else TikTok's general check.
  const samples = !tap ? 0 : her.offers ? (her.offers[id] === 2 ? 1 : 0) : tap.samples <= 0 ? 0 : withSampleOffers([tap], general ?? {})[0].samples;
  return NextResponse.json({
    product: tap ? { ...tap, samples } : null,
    facts: facts ? { rating: facts.rating, reviews: facts.reviews, main: facts.main, sub: facts.sub } : null,
    open,
    off: !tap && facts ? {
      product: { id, name: facts.name, shop: facts.shop ?? "", img: facts.image, price: facts.price ?? 0, rate: open === null ? null : open / 100, category: facts.sub ?? facts.main ?? "", sold: facts.sold },
      wanted,
    } : null,
    refused: !!her.refused[id],
  }, NO_STORE);
}
