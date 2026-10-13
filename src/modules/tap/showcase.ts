import { addShowcaseByLink, getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { allProducts } from "./catalog.ts";
import { makeTapLink } from "./links.ts";

export type AddResult = { added: true } | { added: false; link?: string; error?: string; status: number };

/**
 * + Showcase. An approved creator with TikTok Shop linked gets the product added straight to their showcase through a TAP link
 * (so sales count for Techwide's campaign). Everyone else gets the TAP link to open in TikTok Shop and add it there.
 */
export async function addToShowcase(userId: string, productId: string): Promise<AddResult> {
  const token = await approvedCreatorToken(userId);
  const tap = await makeTapLink(userId, productId);
  if (!tap.ok) return { added: false, error: tap.error, status: tap.status };
  if (!token) return { added: false, link: tap.link, status: 200 };
  const r = await addShowcaseByLink(token, tap.link);
  const failed = r.data?.errors?.[0];
  if (r.code !== 0 || failed) {
    console.error("[showcase add]", r.code, r.message, failed?.code, failed?.message);
    return { added: false, link: tap.link, error: failed?.message || r.message || "TikTok Shop didn't add it. Open the link to add it in TikTok Shop.", status: 502 };
  }
  cache.delete(userId);
  return { added: true };
}

export type ShowcaseSummary = { linked: boolean; count: number; tap: number; more: boolean };
const cache = new Map<string, { at: number; data: ShowcaseSummary }>();
const PAGES = 10;

/** How many products are in an approved creator's showcase and how many are TAP products (first 200; kept 10 minutes). */
export async function showcaseSummary(userId: string): Promise<ShowcaseSummary> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.data;
  const token = await approvedCreatorToken(userId);
  if (!token) return { linked: false, count: 0, tap: 0, more: false };
  const ids: string[] = [];
  let pageToken: string | undefined;
  let page = 0;
  do {
    const r = await getShowcaseProducts(token, pageToken);
    if (r.code !== 0) {
      console.error("[showcase list]", r.code, r.message);
      break;
    }
    ids.push(...(r.data?.products ?? []).map((p) => p.id));
    pageToken = r.data?.next_page_token || undefined;
  } while (pageToken && ++page < PAGES);
  const catalog = new Set((await allProducts()).map((p) => p.id));
  const data = { linked: true, count: ids.length, tap: ids.filter((id) => catalog.has(id)).length, more: !!pageToken };
  cache.set(userId, { at: Date.now(), data });
  return data;
}
