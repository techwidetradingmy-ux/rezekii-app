import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { addShowcaseById, addShowcaseByLink, getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { allProducts } from "./catalog.ts";
import { levelOf } from "../levels/store.ts";
import { makeTapLink } from "./links.ts";

/** `already`: it was in her showcase before (owner, 1 Nov 2026: say "Already in your showcase" only then). */
export type AddResult = { added: true; already?: boolean } | { added: false; link?: string; error?: string; status: number };

/**
 * + Showcase. An approved creator with TikTok Shop linked gets the product added straight to their showcase through a TAP link
 * (so sales count for Techwide's campaign). Everyone else gets the TAP link to open in TikTok Shop and add it there.
 * Fast (owner, 1 Nov 2026): her sign-in, the TAP link and her saved showcase are read at the same time.
 */
export async function addToShowcase(userId: string, productId: string, ctx?: { token: string | null; level: Awaited<ReturnType<typeof levelOf>>; bulk: true }): Promise<AddResult> {
  const [token, tap, have] = await Promise.all([ctx ? ctx.token : approvedCreatorToken(userId), makeTapLink(userId, productId, ctx?.level), ctx ? null : showcaseIds(userId)]);
  const already = !!have?.has(productId);
  // Not in Rezekii's campaigns (owner, 31 Oct 2026: Today's Ideas and AI Picks show TikTok's whole marketplace): added as it is.
  // Already there, it needs nothing from TikTok.
  if (!tap.ok && tap.status === 404 && token) return already ? { added: true, already } : addById(userId, token, productId, !ctx);
  if (!tap.ok) return { added: false, error: tap.error, status: tap.status };
  if (!token) return { added: false, link: tap.link, status: 200 };
  // A Rezekii product is added again even when it's there: the TAP link moves it onto Rezekii's rate.
  const r = await addByTapLink(userId, token, tap.link, !ctx, productId);
  return r.added ? { added: true, already } : r;
}

/** Adds a product to the creator's showcase through a TAP link already made; `count` adds it to her saved showcase. */
export async function addByTapLink(userId: string, token: string, link: string, count = true, productId?: string): Promise<AddResult> {
  const r = await addShowcaseByLink(token, link);
  const failed = r.data?.errors?.[0];
  if (r.code !== 0 || failed) {
    console.error("[showcase add]", r.code, r.message, failed?.code, failed?.message);
    return { added: false, link, error: failed?.message || r.message || "TikTok Shop didn't add it. Open the link to add it in TikTok Shop.", status: 502 };
  }
  if (count && productId) await countAdded(userId, [productId], true);
  return { added: true };
}

async function addById(userId: string, token: string, productId: string, count: boolean): Promise<AddResult> {
  const r = await addShowcaseById(token, [productId]);
  const failed = r.data?.errors?.[0];
  if (r.code !== 0 || failed) {
    console.error("[showcase add by id]", r.code, r.message, failed?.code, failed?.message);
    return { added: false, error: failed?.message || r.message || "TikTok Shop didn't add it. Please try again.", status: 502 };
  }
  if (count) await countAdded(userId, [productId], false);
  return { added: true };
}

/** Products just added go into her saved showcase and its count (`tap`: Rezekii products), so the next Add knows they're there. */
async function countAdded(userId: string, ids: string[], tap: boolean) {
  if (!ids.length) return;
  const [saved, items] = await Promise.all([savedShowcase(userId), savedItems(userId)]);
  const fresh = ids.filter((id) => !items?.some((x) => x.id === id));
  if (!fresh.length) return;
  await Promise.all([
    saved ? saveShowcase(userId, { count: saved.count + fresh.length, tap: saved.tap + (tap ? fresh.length : 0), more: saved.more }, saved.at) : null,
    items ? saveItems(userId, [...fresh.map((id) => ({ id, name: "", img: null })), ...items]) : null,
  ]);
}

/**
 * Several products at once (owner, 14 Oct 2026: one by one took over a minute for 21): the creator's sign-in and level read
 * once, 5 products in parallel, the showcase count saved once at the end.
 */
export async function addManyToShowcase(userId: string, productIds: string[]): Promise<{ productId: string; result: AddResult }[]> {
  const [token, level] = await Promise.all([approvedCreatorToken(userId), levelOf(userId)]);
  const out: { productId: string; result: AddResult }[] = [];
  for (let i = 0; i < productIds.length; i += 5)
    out.push(...(await Promise.all(productIds.slice(i, i + 5).map(async (productId) => ({ productId, result: await addToShowcase(userId, productId, { token, level, bulk: true }) })))));
  await countAdded(userId, out.filter((x) => x.result.added).map((x) => x.productId), true);
  return out;
}

export type ShowcaseSummary = { linked: boolean; count: number; tap: number; more: boolean; at?: string };
export type SavedShowcase = { count: number; tap: number; more: boolean; at: string };
export type ShowcaseItem = { id: string; name: string; img: string | null };
/** Every page of her showcase (owner, 1 Nov 2026: the exact count, not the first 200): 20 a page, up to 5,000 products. */
const PAGES = 250;
/** Saved counts and lists are read again after 6 hours, or when she asks (owner, 1 Nov 2026). */
export const SHOWCASE_FRESH_MS = 6 * 3600_000;

/** The showcase size from the last count, or null before the first one. */
export async function savedShowcase(userId: string): Promise<SavedShowcase | null> {
  const res = await supabaseRest(`affiliate_connections?user_id=eq.${userId}&showcase_at=not.is.null&select=showcase_count,showcase_tap,showcase_more,showcase_at&limit=1`);
  if (!res.ok) return null;
  const [row] = (await res.json()) as { showcase_count: number; showcase_tap: number; showcase_more: boolean; showcase_at: string }[];
  return row ? { count: row.showcase_count, tap: row.showcase_tap, more: row.showcase_more, at: row.showcase_at } : null;
}

/** True when the saved count is missing or older than 6 hours. */
export const showcaseStale = (saved: SavedShowcase | null, now: number) => !saved || now - Date.parse(saved.at) > SHOWCASE_FRESH_MS;

async function saveShowcase(userId: string, s: { count: number; tap: number; more: boolean }, at = new Date().toISOString()) {
  await supabaseRest(`affiliate_connections?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ showcase_count: s.count, showcase_tap: s.tap, showcase_more: s.more, showcase_at: at }),
  });
}

/** Her showcase products as last read (newest first), or null before the first read. */
export async function savedItems(userId: string): Promise<ShowcaseItem[] | null> {
  const [row] = (await (await supabaseRest(`showcase_cache?user_id=eq.${userId}&items_at=not.is.null&select=items&limit=1`)).json().catch(() => [])) as { items: ShowcaseItem[] }[];
  return row ? row.items : null;
}

/** The product IDs in her saved showcase. */
export async function showcaseIds(userId: string): Promise<Set<string>> {
  return new Set((await savedItems(userId).catch(() => null))?.map((x) => x.id) ?? []);
}

async function saveItems(userId: string, items: ShowcaseItem[], more?: boolean) {
  await supabaseRest("showcase_cache?on_conflict=user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, items, ...(more === undefined ? {} : { more, items_at: new Date().toISOString() }), updated_at: new Date().toISOString() }),
  });
}

/** Reads every page of her showcase from TikTok. `ok` is false when TikTok didn't answer the first page. */
export async function readShowcase(token: string): Promise<{ ok: boolean; items: ShowcaseItem[]; more: boolean }> {
  const items: ShowcaseItem[] = [];
  let pageToken: string | undefined;
  let page = 0;
  do {
    const r = await getShowcaseProducts(token, pageToken).catch(() => null);
    if (!r || r.code !== 0) {
      console.error("[showcase list]", r?.code, r?.message);
      if (page === 0) return { ok: false, items: [], more: false };
      break;
    }
    for (const p of r.data?.products ?? []) items.push({ id: p.id, name: p.title ?? "Product", img: p.main_images?.[0]?.url ?? null });
    pageToken = r.data?.next_page_token || undefined;
  } while (pageToken && ++page < PAGES);
  return { ok: true, items, more: !!pageToken };
}

/** Saves a fresh read of her showcase: the count for Today and the scanner, and the list. */
export async function saveRead(userId: string, read: { items: ShowcaseItem[]; more: boolean }): Promise<ShowcaseSummary> {
  const catalog = new Set((await allProducts()).map((p) => p.id));
  const data = { count: read.items.length, tap: read.items.filter((x) => catalog.has(x.id)).length, more: read.more };
  const at = new Date().toISOString();
  await Promise.all([saveShowcase(userId, data, at), saveItems(userId, read.items, read.more)]);
  return { linked: true, ...data, at };
}

/**
 * Her showcase totals (every product, and how many are on Rezekii). The saved count is used while it's under 6 hours old;
 * `fresh` reads TikTok again (Scan again).
 */
export async function showcaseSummary(userId: string, fresh = false): Promise<ShowcaseSummary> {
  const [token, saved] = await Promise.all([approvedCreatorToken(userId), savedShowcase(userId)]);
  if (!token) return { linked: false, count: 0, tap: 0, more: false };
  if (!fresh && saved && !showcaseStale(saved, Date.now())) return { linked: true, count: saved.count, tap: saved.tap, more: saved.more, at: saved.at };
  const read = await readShowcase(token);
  // TikTok didn't answer: keep the last count rather than saving a wrong 0.
  if (!read.ok) return saved ? { linked: true, count: saved.count, tap: saved.tap, more: saved.more, at: saved.at } : { linked: true, count: 0, tap: 0, more: false };
  return saveRead(userId, read);
}

/** Products she removed in Rezekii leave her saved showcase, its count and her saved Risk Check at once (owner, 1 Nov 2026). */
export async function forgetRemoved(userId: string, ids: string[]): Promise<void> {
  const gone = new Set(ids);
  const [saved, row] = await Promise.all([
    savedShowcase(userId),
    supabaseRest(`showcase_cache?user_id=eq.${userId}&select=items,ratings&limit=1`).then((r) => r.json() as Promise<{ items: ShowcaseItem[]; ratings: { total: number; checked: number; flagged: { id: string }[] } | null }[]>).then((x) => x[0] ?? null).catch(() => null),
  ]);
  const catalog = saved ? new Set((await allProducts()).map((p) => p.id)) : null;
  const tapGone = catalog ? ids.filter((id) => catalog.has(id)).length : 0;
  const was = row?.items.filter((x) => gone.has(x.id)).length ?? ids.length;
  const work: Promise<unknown>[] = [];
  if (saved) work.push(saveShowcase(userId, { count: Math.max(0, saved.count - was), tap: Math.max(0, saved.tap - tapGone), more: saved.more }, saved.at));
  if (row) {
    const ratings = row.ratings
      ? { ...row.ratings, total: Math.max(0, row.ratings.total - was), checked: Math.max(0, row.ratings.checked - row.ratings.flagged.filter((f) => gone.has(f.id)).length), flagged: row.ratings.flagged.filter((f) => !gone.has(f.id)) }
      : null;
    work.push(supabaseRest(`showcase_cache?user_id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ items: row.items.filter((x) => !gone.has(x.id)), ratings, updated_at: new Date().toISOString() }) }));
  }
  await Promise.all(work);
}
