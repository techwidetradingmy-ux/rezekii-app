import { shopeeCall } from "./client.ts";

/** One of a shop's products as New post shows it (Product API, signed as the shop). */
export type ShopeeItem = { itemId: number; name: string; image: string | null };

/** Up to this many of a shop's live products are listed (Shopee pages them 100 at a time, details 50 at a time). */
const MAX_ITEMS = 300;

/** A shop's live (NORMAL) products with their name and first photo, newest first as Shopee lists them. */
export async function shopeeShopItems(token: string, shopId: string): Promise<ShopeeItem[]> {
  const shop = { query: { access_token: token, shop_id: shopId }, signWith: [token, shopId] };
  const ids: number[] = [];
  for (let offset = 0; ids.length < MAX_ITEMS; ) {
    const r = await shopeeCall<{ response?: { item?: { item_id: number }[]; has_next_page?: boolean; next_offset?: number } }>("/api/v2/product/get_item_list", {
      ...shop,
      query: { ...shop.query, offset, page_size: 100, item_status: "NORMAL" },
    });
    ids.push(...(r.response?.item ?? []).map((i) => i.item_id));
    if (!r.response?.has_next_page || r.response.next_offset === undefined) break;
    offset = r.response.next_offset;
  }
  const out: ShopeeItem[] = [];
  for (let i = 0; i < ids.length && i < MAX_ITEMS; i += 50) {
    const r = await shopeeCall<{ response?: { item_list?: { item_id: number; item_name?: string; image?: { image_url_list?: string[] } }[] } }>("/api/v2/product/get_item_base_info", {
      ...shop,
      query: { ...shop.query, item_id_list: ids.slice(i, i + 50).join(",") },
    });
    for (const it of r.response?.item_list ?? []) out.push({ itemId: it.item_id, name: it.item_name ?? String(it.item_id), image: it.image?.image_url_list?.[0] ?? null });
  }
  return out;
}
