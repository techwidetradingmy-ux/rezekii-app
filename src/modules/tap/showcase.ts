import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { addShowcaseByLink, getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { allProducts } from "./catalog.ts";
import { levelOf } from "../levels/store.ts";
import { makeTapLink } from "./links.ts";

export type AddResult = { added: true } | { added: false; link?: string; error?: string; status: number };

/**
 * + Showcase. An approved creator with TikTok Shop linked gets the product added straight to their showcase through a TAP link
 * (so sales count for Techwide's campaign). Everyone else gets the TAP link to open in TikTok Shop and add it there.
 */
export async function addToShowcase(userId: string, productId: string, ctx?: { token: string | null; level: Awaited<ReturnType<typeof levelOf>>; bulk: true }): Promise<AddResult> {
  const token = ctx ? ctx.token : await approvedCreatorToken(userId);
  const tap = await makeTapLink(userId, productId, ctx?.level);
  if (!tap.ok) return { added: false, error: tap.error, status: tap.status };
  if (!token) return { added: false, link: tap.link, status: 200 };
  const r = await addShowcaseByLink(token, tap.link);
  const failed = r.data?.errors?.[0];
  if (r.code !== 0 || failed) {
    console.error("[showcase add]", r.code, r.message, failed?.code, failed?.message);
    return { added: false, link: tap.link, error: failed?.message || r.message || "TikTok Shop didn't add it. Open the link to add it in TikTok Shop.", status: 502 };
  }
  if (!ctx) await countAdded(userId, 1);
  return { added: true };
}

async function countAdded(userId: string, n: number) {
  const saved = await savedShowcase(userId);
  if (saved && n) await saveShowcase(userId, { count: saved.count + n, tap: saved.tap + n, more: saved.more }, saved.at);
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
  await countAdded(userId, out.filter((x) => x.result.added).length);
  return out;
}

export type ShowcaseSummary = { linked: boolean; count: number; tap: number; more: boolean };
export type SavedShowcase = { count: number; tap: number; more: boolean; at: string };
const PAGES = 10;
const DAY = 86400_000;

/** The showcase size from the last count, or null before the first one. */
export async function savedShowcase(userId: string): Promise<SavedShowcase | null> {
  const res = await supabaseRest(`affiliate_connections?user_id=eq.${userId}&showcase_at=not.is.null&select=showcase_count,showcase_tap,showcase_more,showcase_at&limit=1`);
  if (!res.ok) return null;
  const [row] = (await res.json()) as { showcase_count: number; showcase_tap: number; showcase_more: boolean; showcase_at: string }[];
  return row ? { count: row.showcase_count, tap: row.showcase_tap, more: row.showcase_more, at: row.showcase_at } : null;
}

/** True when the saved count is missing or more than a day old. */
export const showcaseStale = (saved: SavedShowcase | null, now: number) => !saved || now - Date.parse(saved.at) > DAY;

async function saveShowcase(userId: string, s: { count: number; tap: number; more: boolean }, at = new Date().toISOString()) {
  await supabaseRest(`affiliate_connections?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ showcase_count: s.count, showcase_tap: s.tap, showcase_more: s.more, showcase_at: at }),
  });
}

/** Counts an approved creator's showcase on TikTok Shop (first 200) and how many are TAP products, then saves it for Today. */
export async function showcaseSummary(userId: string): Promise<ShowcaseSummary> {
  const token = await approvedCreatorToken(userId);
  if (!token) return { linked: false, count: 0, tap: 0, more: false };
  const ids: string[] = [];
  let pageToken: string | undefined;
  let page = 0;
  do {
    const r = await getShowcaseProducts(token, pageToken);
    if (r.code !== 0) {
      console.error("[showcase list]", r.code, r.message);
      if (page === 0) {
        // TikTok didn't answer: keep the last count rather than saving a wrong 0.
        const saved = await savedShowcase(userId);
        return saved ? { linked: true, count: saved.count, tap: saved.tap, more: saved.more } : { linked: true, count: 0, tap: 0, more: false };
      }
      break;
    }
    ids.push(...(r.data?.products ?? []).map((p) => p.id));
    pageToken = r.data?.next_page_token || undefined;
  } while (pageToken && ++page < PAGES);
  const catalog = new Set((await allProducts()).map((p) => p.id));
  const data = { count: ids.length, tap: ids.filter((id) => catalog.has(id)).length, more: !!pageToken };
  await saveShowcase(userId, data);
  return { linked: true, ...data };
}
