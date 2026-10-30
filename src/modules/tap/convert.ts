import { generateGeneralLinks, generateTaggedLinks, lookupProducts, selectProducts, type LookedUpProduct, type SelectedProduct } from "../../integrations/tiktok-shop/creator.ts";
import { resolveProductId } from "../../integrations/tiktok-shop/product-id.ts";
import { getProduct, tapProductsWithDescription, type TapProduct } from "./catalog.ts";
import { logLinks, makeTapLink } from "./links.ts";

/**
 * One result row. "aff" = the creator's own TikTok Shop affiliate link, "tap" = a Techwide TAP link,
 * "shop" = needs the creator's TikTok Shop link, "bad" = not a product link, "error" = TikTok refused.
 */
export type ConvertRow = { input: string; kind: "aff" | "tap" | "shop" | "bad" | "error"; productId: string | null; name: string | null; image: string | null; tag: string | null; link: string | null; note: string };

/** The longest tag TikTok accepts on a link (tested 15 Oct 2026: 100 characters work, 255 fail). */
export const TAG_MAX = 100;
/** Several tags in one link, joined as "facebook-threads-whatsapp" (owner, 15 Oct 2026: TikTok allows one tag per link). */
export const joinTags = (tags: string[]) => tags.join("-").slice(0, TAG_MAX).replace(/-+$/, "");

/** Tags as TikTok takes them: lower-case letters, digits, _ and -, at most 20 characters, no repeats. */
export function cleanTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : [];
  return [...new Set(list.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20)).filter(Boolean))].slice(0, 10);
}

/** Turns one pasted link into result rows. With a TikTok Shop link: one affiliate link carrying all the tags. Without: TAP products only. */
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
      const r = await generateTaggedLinks(token, id, [joinTags(tags)]);
      for (const l of r.data?.affiliate_sharing_links ?? []) made.push({ ...base, kind: "aff", productId: id, name, image, tag: l.tag, link: l.affiliate_sharing_link, note: "" });
      // TikTok also sends an empty error entry for every link that worked.
      for (const e of r.data?.errors ?? []) if (e.detail?.fail_reason || e.message) made.push({ ...base, kind: "error", productId: id, name, image, tag: e.detail?.tag ?? null, note: e.detail?.fail_reason || e.message });
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
  brand: string | null;
  rating: number | null;
  reviews: number | null;
  shopRating: number | null;
  /** In Techwide's TAP: the listing's description and its variants ([name, price, stock]). */
  tap: boolean;
  description: string | null;
  variants: [string, number, number][];
};

type TapInfo = TapProduct & { description?: string | null };
const num = (s: string | number | undefined | null) => (s === undefined || s === null || s === "" ? null : Number(s));
const extras = (x: SelectedProduct | undefined, t: TapInfo | undefined) => ({
  brand: x?.brand_name || null, rating: num(x?.review?.overall_score), reviews: x?.review?.count ?? null, shopRating: num(x?.shop?.rating),
  tap: !!t, description: t?.description ?? null, variants: t?.variants ?? [],
});

const fromTap = (input: string, p: TapInfo, x?: SelectedProduct): LookupRow => ({
  input, ok: true, id: p.id, name: p.name, image: p.image, shop: p.shop, category: p.category, priceLo: p.priceLo, priceHi: p.priceHi,
  rate: p.openRate, sold: x?.market_performance?.historical_sold_quantity ?? p.sold, stock: x?.stock?.quantity ?? p.stock, source: "tap", note: "", ...extras(x, p),
});
/** TikTok often sends `sales_price` with empty amounts; the price is then in `original_price`. */
const amount = (s: string | undefined) => (s ? Number(s) : null);
export const fromTikTok = (input: string, p: LookedUpProduct, x?: SelectedProduct, t?: TapInfo): LookupRow => {
  const price = p.sales_price?.minimum_amount ? p.sales_price : p.original_price;
  return {
    input, ok: true, id: p.id, name: p.title, image: p.main_image_url ?? null, shop: p.shop?.name ?? null,
    category: p.category_chains?.find((c) => c.is_leaf)?.local_name ?? p.category_chains?.at(-1)?.local_name ?? null,
    priceLo: amount(price?.minimum_amount), priceHi: amount(price?.maximum_amount),
    rate: p.commission?.rate ?? null, sold: x?.market_performance?.historical_sold_quantity ?? p.units_sold ?? null, stock: x?.stock?.quantity ?? null,
    source: "tiktok", note: p.has_inventory === false ? "Out of stock" : "", ...extras(x, t),
  };
};

/**
 * Facts for up to 20 pasted links. With a TikTok Shop link: TikTok Shop's Product Lookup plus its product search (brand, rating,
 * stock, all-time sold, shop rating); Techwide TAP products also get their description and variants. Without one, TAP only.
 */
export async function lookupLinks(token: string | null, inputs: string[]): Promise<LookupRow[]> {
  const ids = await Promise.all(inputs.map((l) => resolveProductId(l)));
  const facts = new Map<string, LookedUpProduct>();
  const more = new Map<string, SelectedProduct>();
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  const [tap] = await Promise.all([
    tapProductsWithDescription(wanted),
    token && wanted.length
      ? Promise.all([
          lookupProducts(token, wanted).then((r) => { for (const p of r.data?.products ?? []) facts.set(p.id, p); }),
          selectProducts(token, wanted).then((r) => { for (const p of r.data?.products ?? []) more.set(p.id, p); }).catch(() => undefined),
        ])
      : null,
  ]);
  const none = (input: string, id: string | null, note: string): LookupRow => ({
    input, ok: false, id, name: input, image: null, shop: null, category: null, priceLo: null, priceHi: null, rate: null, sold: null, stock: null, source: null, note,
    brand: null, rating: null, reviews: null, shopRating: null, tap: false, description: null, variants: [],
  });
  return inputs.map((input, i) => {
    const id = ids[i];
    if (!id) return none(input, null, "Not a TikTok Shop product link");
    const f = facts.get(id);
    if (f) return fromTikTok(input, f, more.get(id), tap.get(id));
    const t = tap.get(id);
    if (t) return fromTap(input, t, more.get(id));
    return none(input, id, token ? "TikTok: this product is not open for affiliate promotion" : "Needs your TikTok Shop link");
  });
}

/**
 * The creator's own affiliate link for each product (TikTok's general sharing link, made with their TikTok Shop sign-in), for the
 * lookup export: shared anywhere, sales through it are credited to them. Up to 50 IDs per TikTok call.
 */
export async function lookupAffiliateLinks(token: string, ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const r = await generateGeneralLinks(token, ids.slice(i, i + 50));
    for (const l of r.data?.sharing_links ?? []) if (l.sharing_link) out[l.material_id] = l.sharing_link;
  }
  return out;
}
