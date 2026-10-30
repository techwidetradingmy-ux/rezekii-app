import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getShopProduct } from "../../integrations/tiktok-shop/seller.ts";
import { openRates } from "../marketplace/shop-products.ts";
import { sellerAccessFor } from "../marketplace/seller-connection.ts";

/** The least extra commission above the public rate a product joins Techwide's TAP with. */
export const MIN_RAISE = 2;

export type SubmitInput = { productIds: string[]; raise: number; samples: number; conditions: Record<string, unknown> };
export type SubmitResult = { submitted: { id: string; name: string; image: string | null }[]; skipped: { id: string; why: string }[] };

/**
 * A seller asks to put products into Techwide's TAP (owner, 30 Oct 2026). Each request waits for Techwide's review; nothing
 * changes on TikTok yet. Only the seller's own products that buyers can see, not already in TAP or already asked for.
 */
export async function submitToTap(user: { id: string; role: string }, input: SubmitInput): Promise<SubmitResult | { error: string }> {
  const ids = [...new Set(input.productIds.map(String))].filter((id) => /^\d{6,25}$/.test(id));
  if (!ids.length || ids.length > 50) return { error: "Pick 1 to 50 products." };
  if (!Number.isFinite(input.raise) || input.raise < MIN_RAISE || input.raise > 80) return { error: `Commission must be at least +${MIN_RAISE}% above the public rate.` };
  if (!Number.isInteger(input.samples) || input.samples <= 0 || input.samples > 1000) return { error: "Samples per SKU must be more than 0." };
  const access = await sellerAccessFor(user);
  if (!access) return { error: "Connect your Seller Center first." };
  const { shop, token } = access;

  const inTap = new Set(((await (await supabaseRest(`tap_catalog?product_id=in.(${ids.join(",")})&select=product_id`)).json()) as { product_id: string }[]).map((r) => r.product_id));
  const result: SubmitResult = { submitted: [], skipped: [] };
  // Each product's public commission now, kept with the request so Techwide's review sees it.
  const rates = await openRates(token, shop.cipher).catch(() => new Map<string, number>());
  for (const id of ids) {
    if (inTap.has(id)) { result.skipped.push({ id, why: "Already in TAP." }); continue; }
    // TikTok answers only for this shop's own products, so this also checks the product is theirs.
    const p = await getShopProduct(token, shop.cipher, id);
    if (p.code !== 0 || !p.data) { result.skipped.push({ id, why: "Not found in your shop." }); continue; }
    if (p.data.status !== "ACTIVATE") { result.skipped.push({ id, why: "Not live on TikTok yet." }); continue; }
    const name = p.data.title ?? "Product";
    const image = p.data.main_images?.[0]?.thumb_urls?.[0] ?? p.data.main_images?.[0]?.urls?.[0] ?? null;
    try {
      await supabaseRest("tap_submissions", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ shop_id: shop.id, product_id: id, product_name: name, product_image: image, submitted_by: user.id, raise_pct: input.raise, samples_per_sku: input.samples, creator_conditions: input.conditions, public_rate: rates.get(id) ?? null }),
      });
      result.submitted.push({ id, name, image });
    } catch (err) {
      // An open request for this product already exists (a second tap or another tab).
      const dup = err instanceof Error && /Supabase 409/.test(err.message);
      if (!dup) console.error("[tap] submission save failed", err instanceof Error ? err.message : err);
      result.skipped.push({ id, why: dup ? "Already submitted." : "Couldn't save it. Please try again." });
    }
  }
  return result;
}
