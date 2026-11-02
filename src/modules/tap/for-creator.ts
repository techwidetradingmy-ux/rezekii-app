import { after } from "next/server";
import { allProducts, withCreatorOffers, type TapProduct } from "./catalog.ts";
import { refusedProducts } from "./raises.ts";
import { checkCreatorSamples, creatorOffers } from "./samples.ts";

/**
 * What one creator can really get, read once per page (owner, 2 Nov 2026), for every list of offers: her own TikTok sample check
 * (2 = she can request it; null when she has none yet) and the products TikTok refused to add to her showcase.
 */
export type HerOffers = { offers: Record<string, number> | null; refused: Record<string, string> };
export async function herOffers(userId: string): Promise<HerOffers> {
  const [mine, refused] = await Promise.all([creatorOffers(userId).catch(() => null), refusedProducts(userId).catch(() => ({}))]);
  return { offers: mine?.offers ?? null, refused };
}

/**
 * The Marketplace as one creator can use it (owner, 16 Oct 2026): free samples are the ones their own TikTok check says they
 * can request. Without a check from today (or with none yet) one starts in the background; until it's saved they see the
 * products TikTok confirms in general. Products TikTok refused to add to her showcase are left out (owner, 2 Nov 2026).
 */
export async function productsFor(userId: string): Promise<TapProduct[]> {
  const [all, mine, refused] = await Promise.all([allProducts(), creatorOffers(userId).catch(() => null), refusedProducts(userId).catch(() => ({} as Record<string, string>))]);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (!mine || mine.day < today) after(() => checkCreatorSamples(userId).catch((err) => console.error("[creator samples]", err instanceof Error ? err.message : err)));
  const open = all.filter((p) => !refused[p.id]);
  return mine ? withCreatorOffers(open, mine.offers) : open;
}
