import { after } from "next/server";
import { allProducts, withCreatorOffers, type TapProduct } from "./catalog.ts";
import { checkCreatorSamples, creatorOffers } from "./samples.ts";

/**
 * The Marketplace as one creator can use it (owner, 16 Oct 2026): free samples are the ones their own TikTok check says they
 * can request. Without a check from today (or with none yet) one starts in the background; until it's saved they see the
 * products TikTok confirms in general.
 */
export async function productsFor(userId: string): Promise<TapProduct[]> {
  const [all, mine] = await Promise.all([allProducts(), creatorOffers(userId).catch(() => null)]);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (!mine || mine.day < today) after(() => checkCreatorSamples(userId).catch((err) => console.error("[creator samples]", err instanceof Error ? err.message : err)));
  return mine ? withCreatorOffers(all, mine.offers) : all;
}
