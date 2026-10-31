import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { allProducts, getProduct } from "../tap/catalog.ts";
import { lookupLinks } from "../tap/convert.ts";

const DAY = 86_400_000;

/** A product as the wish list shows it. `rate` is a percent (6 = 6%). */
export type WishProduct = { id: string; name: string; shop: string; img: string | null; price: number; rate: number | null; category: string; sold: number | null };
export type Commit = { videos: number; lives: number; rights: 0 | 90 | 180; months: 1 | 3 | 6; note?: string };
/** `changed`: when the seller said no, or when we first saw it on Rezekii; null while it's still a wish. */
export type MyWish = WishProduct & { status: "On wish list" | "On Rezekii" | "Seller said no"; at: string; changed: string | null; commit: Commit; raise: number | null };
/** One product on the board: how many creators asked and what they committed in all. No names, no rates (owner, 29 Oct 2026). */
export type BoardItem = WishProduct & { creators: number; videos: number; lives: number; rights: number; week: number; first: string };

type Row = {
  product_id: string; name: string; shop: string | null; image: string | null; category: string | null; price: number | null; rate: number | null;
  videos: number; lives: number; rights: 0 | 90 | 180; months: 1 | 3 | 6; note: string | null; declined_at: string | null; launched_at: string | null; raise: number | null; created_at: string;
};
const COLS = "product_id,name,shop,image,category,price,rate,videos,lives,rights,months,note,declined_at,launched_at,raise,created_at";
const product = (r: Row): WishProduct => ({ id: r.product_id, name: r.name, shop: r.shop ?? "", img: r.image, price: Number(r.price ?? 0), rate: r.rate === null ? null : r.rate / 100, category: r.category ?? "", sold: null });

/** The facts TikTok Shop gives for one pasted link (or ID), and whether it's already on Rezekii. */
export async function findProduct(token: string | null, input: string): Promise<{ product: WishProduct; onRezekii: boolean } | { error: string }> {
  const [row] = await lookupLinks(token, [input.trim().slice(0, 500)]);
  if (!row?.ok || !row.id) return { error: row?.note && row.note !== "Not a TikTok Shop product link" ? row.note : "Couldn't find this product. Check the link." };
  return {
    product: { id: row.id, name: row.name, shop: row.shop ?? "", img: row.image, price: row.priceLo ?? 0, rate: row.rate === null ? null : row.rate / 100, category: row.category ?? "", sold: row.sold },
    onRezekii: !!(await getProduct(row.id)),
  };
}

/** findProduct for a product page, kept 30 minutes per product (owner, 1 Nov 2026: a product opens fast the second time). */
export async function findProductCached(token: string | null, id: string): Promise<{ product: WishProduct; onRezekii: boolean } | { error: string }> {
  if (!/^\d{6,25}$/.test(id)) return findProduct(token, id);
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const [hit] = (await (await supabaseRest(`product_facts_cache?product_id=eq.${id}&at=gte.${since}&select=data&limit=1`)).json().catch(() => [])) as { data: { product: WishProduct; onRezekii: boolean } }[];
  if (hit) return hit.data;
  const found = await findProduct(token, id);
  if (!("error" in found))
    await supabaseRest("product_facts_cache?on_conflict=product_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ product_id: id, data: found, at: new Date().toISOString() }) }).catch(() => null);
  return found;
}

/** Her wishes, newest first, with where each one is now. */
export async function myWishes(userId: string): Promise<MyWish[]> {
  const rows = (await (await supabaseRest(`wishes?user_id=eq.${userId}&select=${COLS}&order=created_at.desc&limit=200`)).json()) as Row[];
  const live = new Set((await allProducts()).map((p) => p.id));
  // The first time a wish is seen on Rezekii, that moment is kept (for her notification).
  const now = new Date().toISOString();
  const launched = rows.filter((r) => live.has(r.product_id) && !r.launched_at).map((r) => r.product_id);
  if (launched.length) {
    await supabaseRest(`wishes?user_id=eq.${userId}&product_id=in.(${launched.join(",")})&launched_at=is.null`, {
      method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ launched_at: now }),
    }).catch(() => null);
  }
  return rows.map((r) => ({
    ...product(r),
    status: live.has(r.product_id) ? "On Rezekii" : r.declined_at ? "Seller said no" : "On wish list",
    at: r.created_at,
    changed: live.has(r.product_id) ? r.launched_at ?? now : r.declined_at,
    commit: { videos: r.videos, lives: r.lives, rights: r.rights, months: r.months, ...(r.note ? { note: r.note } : {}) },
    raise: r.raise === null ? null : Number(r.raise),
  }));
}

/** Saves her wish (or changes it). The product's facts come from TikTok Shop, not from the page. */
export async function saveWish(userId: string, token: string | null, productId: string, c: Commit): Promise<{ ok: true } | { error: string }> {
  if (!/^\d{15,21}$/.test(productId)) return { error: "That isn't a TikTok Shop product." };
  const videos = Math.round(Number(c.videos));
  const lives = Math.round(Number(c.lives));
  if (!(videos >= 0 && videos <= 60 && lives >= 0 && lives <= 30)) return { error: "Choose up to 60 videos and 30 LIVE sessions a month." };
  if (videos + lives === 0) return { error: "Commit at least 1 video or LIVE a month." };
  if (![0, 90, 180].includes(c.rights) || ![1, 3, 6].includes(c.months)) return { error: "Pick ad rights and how long from the list." };
  const found = await findProduct(token, productId);
  if ("error" in found) return found;
  if (found.onRezekii) return { error: "It's already on Rezekii. Add it from the Marketplace." };
  const p = found.product;
  const note = typeof c.note === "string" ? c.note.trim().slice(0, 200) || null : null;
  const res = await supabaseRest("wishes?on_conflict=user_id,product_id", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId, product_id: p.id, name: p.name.slice(0, 300), shop: p.shop || null, image: p.img, category: p.category || null, price: p.price || null,
      rate: p.rate === null ? null : Math.round(p.rate * 100), videos, lives, rights: c.rights, months: c.months, note, updated_at: new Date().toISOString(),
    }),
  });
  return res.ok ? { ok: true } : { error: "Didn't save. Please try again." };
}

/** Every wished-for product not on Rezekii yet, with what creators committed in all. */
export async function board(): Promise<BoardItem[]> {
  const rows = (await (await supabaseRest(`wishes?declined_at=is.null&select=${COLS}&order=created_at.asc&limit=5000`)).json()) as Row[];
  const live = new Set((await allProducts()).map((p) => p.id));
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const by = new Map<string, BoardItem>();
  for (const r of rows) {
    if (live.has(r.product_id)) continue;
    const b = by.get(r.product_id) ?? by.set(r.product_id, { ...product(r), creators: 0, videos: 0, lives: 0, rights: 0, week: 0, first: r.created_at }).get(r.product_id)!;
    b.creators += 1;
    b.videos += r.videos;
    b.lives += r.lives;
    if (r.rights > 0) b.rights += 1;
    if (r.created_at >= weekAgo) b.week += 1;
  }
  return [...by.values()].sort((a, b) => b.creators - a.creators || b.videos - a.videos);
}

/** One product's board numbers, or null when no one has asked for it. */
export async function wantedOne(productId: string): Promise<BoardItem | null> {
  if (!/^\d{15,21}$/.test(productId)) return null;
  return (await board()).find((b) => b.id === productId) ?? null;
}

/** One creator's wish as admins see it: who, what they commit, and their note. */
export type AdminWish = { handle: string; name: string; videos: number; lives: number; rights: number; months: number; note: string | null; at: string };
/** The board for admins (owner, 31 Oct 2026): every product still wished for, with each creator's commitment. */
export async function adminBoard(): Promise<(BoardItem & { wishes: AdminWish[]; declined: boolean; raise: number | null })[]> {
  const rows = (await (await supabaseRest(`wishes?select=user_id,${COLS}&order=created_at.asc&limit=5000`)).json()) as (Row & { user_id: string })[];
  const live = new Set((await allProducts()).map((p) => p.id));
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const users = new Map<string, { display_name: string | null; tiktok_username: string | null; email: string | null }>();
  for (let i = 0; i < ids.length; i += 150) {
    const page = (await (await supabaseRest(`app_users?id=in.(${ids.slice(i, i + 150).join(",")})&select=id,display_name,tiktok_username,email`)).json()) as { id: string; display_name: string | null; tiktok_username: string | null; email: string | null }[];
    for (const u of page) users.set(u.id, u);
  }
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const by = new Map<string, BoardItem & { wishes: AdminWish[]; declined: boolean; raise: number | null }>();
  for (const r of rows) {
    if (live.has(r.product_id)) continue;
    const b = by.get(r.product_id) ?? by.set(r.product_id, { ...product(r), creators: 0, videos: 0, lives: 0, rights: 0, week: 0, first: r.created_at, wishes: [], declined: !!r.declined_at, raise: r.raise === null ? null : Number(r.raise) }).get(r.product_id)!;
    const u = users.get(r.user_id);
    b.creators += 1;
    b.videos += r.videos;
    b.lives += r.lives;
    if (r.rights > 0) b.rights += 1;
    if (r.created_at >= weekAgo) b.week += 1;
    b.wishes.push({ handle: u?.tiktok_username ? `@${u.tiktok_username}` : "", name: u?.display_name ?? u?.email?.split("@")[0] ?? "Creator", videos: r.videos, lives: r.lives, rights: r.rights, months: r.months, note: r.note, at: r.created_at });
  }
  return [...by.values()].sort((a, b) => Number(a.declined) - Number(b.declined) || b.creators - a.creators);
}

/** The seller's answer for every wish on one product: no (it leaves the board), or the extra rate agreed for creators. */
export async function decideWish(productId: string, d: { declined: boolean } | { raise: number }): Promise<boolean> {
  if (!/^\d{15,21}$/.test(productId)) return false;
  const body = "declined" in d ? { declined_at: d.declined ? new Date().toISOString() : null } : { raise: d.raise };
  const res = await supabaseRest(`wishes?product_id=eq.${productId}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }) });
  return res.ok;
}
