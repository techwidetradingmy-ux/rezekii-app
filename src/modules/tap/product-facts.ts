import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { lookupProducts, selectProducts } from "../../integrations/tiktok-shop/creator.ts";
import { CAT } from "../rankings/build.ts";

/**
 * TikTok's facts for one product page (owner, 2 Nov 2026: read when she opens it, as fast as possible, not nightly): its buyer
 * rating, main and sub category, open plan rate (×100) and the listing as TikTok shows it. Asked with her TikTok Shop sign-in,
 * then kept a day for everyone, so the next open doesn't ask TikTok again.
 */
export type ProductFacts = {
  rating: number | null; reviews: number | null; main: string | null; sub: string | null; openRate: number | null;
  name: string; shop: string | null; image: string | null; price: number | null; sold: number | null;
};

const DAY = 86_400_000;
const isId = (id: string) => /^\d{6,25}$/.test(id);
const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
type Listing = Pick<ProductFacts, "name" | "shop" | "image" | "price" | "sold">;
type Row = { rating: number | null; reviews: number | null; main_category: string | null; sub_category: string | null; open_rate: number | null; listing: Listing | null };

/** The facts a product page saved in the last day, else null. */
export async function savedFacts(id: string): Promise<ProductFacts | null> {
  if (!isId(id)) return null;
  const since = new Date(Date.now() - DAY).toISOString();
  const [r] = (await (await supabaseRest(`product_details?product_id=eq.${id}&at=gte.${since}&select=rating,reviews,main_category,sub_category,open_rate,listing&limit=1`)).json()) as Row[];
  if (!r?.listing) return null;
  return { rating: num(r.rating), reviews: r.reviews, main: r.main_category, sub: r.sub_category, openRate: r.open_rate, ...r.listing };
}

/**
 * TikTok splits these over two answers, so both are asked at the same time, once each for this one product: Product Lookup
 * (categories, open plan rate, listing) and the product search (rating, reviews). Null when TikTok gives neither.
 */
export async function askFacts(token: string, id: string): Promise<ProductFacts | null> {
  if (!isId(id)) return null;
  const [look, sel] = await Promise.all([
    lookupProducts(token, [id]).then((r) => r.data?.products?.find((p) => p.id === id)).catch(() => undefined),
    selectProducts(token, [id]).then((r) => r.data?.products?.find((p) => p.id === id)).catch(() => undefined),
  ]);
  if (!look && !sel) return null;
  const chain = look?.category_chains ?? [];
  const main = chain.find((c) => CAT[c.id]) ?? chain.find((c) => !c.parent_id || c.parent_id === "0") ?? chain[0];
  const leaf = chain.find((c) => c.is_leaf) ?? chain.at(-1);
  // TikTok often sends `sales_price` with empty amounts; the price is then in `original_price`.
  const price = look?.sales_price?.minimum_amount ? look.sales_price : look?.original_price;
  const score = num(sel?.review?.overall_score);
  return {
    rating: score && score > 0 ? score : null, reviews: sel?.review?.count ?? null,
    main: main?.local_name ?? null, sub: leaf && leaf !== main ? leaf.local_name : null,
    openRate: look?.commission?.rate ?? sel?.commission?.rate ?? null,
    name: look?.title ?? sel?.title ?? "Product", shop: look?.shop?.name ?? sel?.shop?.name ?? null, image: look?.main_image_url ?? sel?.main_image_url ?? null,
    price: num(price?.minimum_amount) ?? num(sel?.price?.floor_price), sold: sel?.market_performance?.historical_sold_quantity ?? look?.units_sold ?? null,
  };
}

/** Saves what TikTok said, for a day. A rating TikTok didn't send this time doesn't wipe one Rezekii already knows. */
export async function saveFacts(id: string, f: ProductFacts): Promise<void> {
  const at = new Date().toISOString();
  await supabaseRest("product_details?on_conflict=product_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      product_id: id, main_category: f.main, sub_category: f.sub, open_rate: f.openRate, listing: { name: f.name, shop: f.shop, image: f.image, price: f.price, sold: f.sold }, at,
      ...(f.rating !== null ? { rating: f.rating, reviews: f.reviews, rating_at: at } : {}),
    }),
  });
}

/** Ratings Rezekii already knows, for product cards (owner, 2 Nov 2026): never asks TikTok. */
export async function knownRatings(ids: string[]): Promise<Map<string, number>> {
  const clean = [...new Set(ids)].filter(isId).slice(0, 200);
  if (!clean.length) return new Map();
  const rows = (await (await supabaseRest(`product_details?product_id=in.(${clean.join(",")})&rating=not.is.null&select=product_id,rating`)).json()) as { product_id: string; rating: number }[];
  return new Map(rows.map((r) => [r.product_id, Number(r.rating)]));
}

/** Keeps the ratings Today's Ideas and AI Picks got from TikTok, so other product cards can show them too. */
export async function keepRatings(rows: { id: string; rating: number | null }[]): Promise<void> {
  const at = new Date().toISOString();
  const body = [...new Map(rows.filter((r) => r.rating !== null && r.rating > 0 && isId(r.id)).map((r) => [r.id, { product_id: r.id, rating: r.rating, rating_at: at }])).values()];
  if (body.length) await supabaseRest("product_details?on_conflict=product_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(body) });
}
