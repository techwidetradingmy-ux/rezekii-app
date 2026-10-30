import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { shopProducts } from "../marketplace/shop-products.ts";
import { allProducts } from "../tap/catalog.ts";

type Row = { id: string; name: string; shop: string | null; image: string | null; price: number | null; sold: number; rate: number | null; creators: number; mine: boolean };
export type Competitors = { linked: boolean; categories: { name: string; mine: number; products: Row[]; creators: { handle: string; products: number; gmv: number; videos: number }[] }[]; asOf: string | null };

/**
 * Competitors on real data (owner, 31 Oct 2026): for each category her products are in, the best-selling products in
 * Techwide's TAP catalog from other shops (TikTok's all-time sold), their rates and how many creators promote them, and the
 * creators selling most in that category. Rezekii's catalog, not all of TikTok Shop.
 */
export async function competitors(user: { id: string; role: string }): Promise<Competitors> {
  const shop = await shopProducts(user);
  if (!shop) return { linked: false, categories: [], asOf: null };
  const cats = [...new Set(shop.items.map((p) => p.leaf).filter(Boolean))];
  const mineIds = new Set(shop.items.map((p) => p.id));
  const catalog = await allProducts();
  const inCats = catalog.filter((p) => p.category && cats.includes(p.category));
  const ids = inCats.map((p) => p.id);
  const promo: { product_id: string; username: string; paid: number; videos: number }[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    promo.push(...((await (await supabaseRest(`tap_creator_products?product_id=in.(${ids.slice(i, i + 150).join(",")})&select=product_id,username,paid,videos&limit=5000`)).json()) as typeof promo));
  }
  const byProduct = new Map<string, number>();
  for (const x of promo) byProduct.set(x.product_id, (byProduct.get(x.product_id) ?? 0) + 1);
  const categories = cats.map((name) => {
    const list = inCats.filter((p) => p.category === name).sort((a, b) => b.sold - a.sold);
    const products: Row[] = list.slice(0, 15).map((p) => ({
      id: p.id, name: p.name, shop: p.shop, image: p.image, price: p.priceLo, sold: p.sold, rate: p.silverRate ?? p.openRate, creators: byProduct.get(p.id) ?? 0, mine: mineIds.has(p.id),
    }));
    const inThis = new Set(list.map((p) => p.id));
    const creators = new Map<string, { handle: string; products: number; gmv: number; videos: number }>();
    for (const x of promo.filter((y) => inThis.has(y.product_id) && !mineIds.has(y.product_id))) {
      const c = creators.get(x.username) ?? creators.set(x.username, { handle: `@${x.username}`, products: 0, gmv: 0, videos: 0 }).get(x.username)!;
      c.products += 1;
      c.gmv += Number(x.paid) || 0;
      c.videos += x.videos ?? 0;
    }
    return { name, mine: shop.items.filter((p) => p.leaf === name).length, products, creators: [...creators.values()].sort((a, b) => b.gmv - a.gmv || b.videos - a.videos).slice(0, 10) };
  }).filter((c) => c.products.length).sort((a, b) => b.mine - a.mine);
  return { linked: true, categories, asOf: catalog[0]?.asOf ?? null };
}
