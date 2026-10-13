import { generateGeneralLinks, generateTaggedLinks, lookupProducts, type LookedUpProduct } from "../../integrations/tiktok-shop/creator.ts";
import { resolveProductId } from "../../integrations/tiktok-shop/product-id.ts";
import { getProduct, type TapProduct } from "./catalog.ts";
import { logLinks, makeTapLink } from "./links.ts";

/**
 * One result row. "aff" = the creator's own TikTok Shop affiliate link (one per tag), "tap" = a Techwide TAP link,
 * "shop" = needs the creator's TikTok Shop link, "bad" = not a product link, "error" = TikTok refused.
 */
export type ConvertRow = { input: string; kind: "aff" | "tap" | "shop" | "bad" | "error"; productId: string | null; name: string | null; image: string | null; tag: string | null; link: string | null; note: string };

/** Tags as TikTok takes them: lower-case letters, digits, _ and -, at most 20 characters, no repeats. */
export function cleanTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : [];
  return [...new Set(list.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20)).filter(Boolean))].slice(0, 10);
}

/** Turns one pasted link into result rows. With a TikTok Shop link: one affiliate link per tag. Without: TAP products only. */
export async function convertLink(user: { id: string }, token: string | null, input: string, tags: string[]): Promise<ConvertRow[]> {
  const base = { input, productId: null, name: null, image: null, tag: null, link: null };
  const id = await resolveProductId(input);
  if (!id) return [{ ...base, kind: "bad", note: "Not a TikTok Shop product link" }];
  const tap = await getProduct(id);
  if (token) {
    const facts = tap ? null : (await lookupProducts(token, [id])).data?.products?.[0];
    const name = tap?.name ?? facts?.title ?? null;
    const image = tap?.image ?? facts?.main_image_url ?? null;
    const made: ConvertRow[] = [];
    if (tags.length) {
      const r = await generateTaggedLinks(token, id, tags);
      for (const l of r.data?.affiliate_sharing_links ?? []) made.push({ ...base, kind: "aff", productId: id, name, image, tag: l.tag, link: l.affiliate_sharing_link, note: "" });
      for (const e of r.data?.errors ?? []) made.push({ ...base, kind: "error", productId: id, name, image, tag: e.detail?.tag ?? null, note: e.detail?.fail_reason || e.message });
      if (r.code !== 0 && !made.length) made.push({ ...base, kind: "error", productId: id, name, image, note: r.message || `TikTok error ${r.code}` });
    } else {
      const r = await generateGeneralLinks(token, [id]);
      const l = r.data?.sharing_links?.[0];
      const failed = r.data?.failed_materials?.[0];
      made.push(l?.sharing_link ? { ...base, kind: "aff", productId: id, name, image, link: l.sharing_link, note: "" } : { ...base, kind: "error", productId: id, name, image, note: failed?.fail_reason || r.message || `TikTok error ${r.code}` });
    }
    await logLinks(user.id, made.filter((m) => m.kind === "aff").map((m) => ({ productId: id, name, image, tag: m.tag, link: m.link! })));
    return made;
  }
  if (!tap) return [{ ...base, kind: "shop", productId: id, note: "Needs your TikTok Shop link" }];
  const r = await makeTapLink(user.id, id);
  return [r.ok ? { ...base, kind: "tap", productId: id, name: r.name, image: r.image, link: r.link, note: "TAP" } : { ...base, kind: "error", productId: id, name: tap.name, image: tap.image, note: r.error }];
}

/** Product facts for the lookup table, in the creator-facing shape both sources share. */
export type LookupRow = {
  input: string;
  ok: boolean;
  id: string | null;
  name: string;
  image: string | null;
  shop: string | null;
  category: string | null;
  priceLo: number | null;
  priceHi: number | null;
  /** ×100 */
  rate: number | null;
  sold: number | null;
  stock: number | null;
  source: "tiktok" | "tap" | null;
  note: string;
};

const fromTap = (input: string, p: TapProduct): LookupRow => ({
  input, ok: true, id: p.id, name: p.name, image: p.image, shop: p.shop, category: p.category, priceLo: p.priceLo, priceHi: p.priceHi,
  rate: p.openRate, sold: p.sold, stock: p.stock, source: "tap", note: "",
});
const fromTikTok = (input: string, p: LookedUpProduct): LookupRow => ({
  input, ok: true, id: p.id, name: p.title, image: p.main_image_url ?? null, shop: p.shop?.name ?? null,
  category: p.category_chains?.find((c) => c.is_leaf)?.local_name ?? p.category_chains?.at(-1)?.local_name ?? null,
  priceLo: p.sales_price ? Number(p.sales_price.minimum_amount) : null, priceHi: p.sales_price ? Number(p.sales_price.maximum_amount) : null,
  rate: p.commission?.rate ?? null, sold: p.units_sold ?? null, stock: null, source: "tiktok", note: p.has_inventory === false ? "Out of stock" : "",
});

/**
 * Facts for up to 20 pasted links. With a TikTok Shop link, from TikTok Shop's Product Lookup; otherwise from Techwide's TAP
 * catalog (other products then need the creator's TikTok Shop link).
 */
export async function lookupLinks(token: string | null, inputs: string[]): Promise<LookupRow[]> {
  const ids = await Promise.all(inputs.map((l) => resolveProductId(l)));
  const facts = new Map<string, LookedUpProduct>();
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  if (token && wanted.length) for (const p of (await lookupProducts(token, wanted)).data?.products ?? []) facts.set(p.id, p);
  const none = (input: string, id: string | null, note: string): LookupRow => ({
    input, ok: false, id, name: input, image: null, shop: null, category: null, priceLo: null, priceHi: null, rate: null, sold: null, stock: null, source: null, note,
  });
  return Promise.all(
    inputs.map(async (input, i) => {
      const id = ids[i];
      if (!id) return none(input, null, "Not a TikTok Shop product link");
      const f = facts.get(id);
      if (f) return fromTikTok(input, f);
      const tap = await getProduct(id);
      if (tap) return fromTap(input, tap);
      return none(input, id, token ? "TikTok: this product is not open for affiliate promotion" : "Needs your TikTok Shop link");
    }),
  );
}
