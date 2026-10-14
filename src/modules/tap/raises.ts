import { getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { levelOf } from "../levels/store.ts";
import { allProducts, type TapProduct } from "./catalog.ts";
import { addToShowcase } from "./showcase.ts";

/** A product in the creator's showcase that pays more through Techwide's TAP campaign than it pays them now. */
export type Raise = { productId: string; name: string; shop: string; image: string | null; price: number | null; nowRate: number; tapRate: number };

/** What TikTok's showcase list says about one product (the fields Rezekii reads). */
export type ShowcaseEntry = {
  id: string; title?: string; commission?: { rate?: number }; collaboration?: { partner?: { id?: string; name?: string } }; shop?: { name?: string };
  /** e.g. { added_status: "REJECTED", review_status: "UNAVAILABLE" } for a product TikTok refused in this showcase. */
  status?: { added_status?: string; review_status?: string };
};

const TECHWIDE = /techwide/i;

/**
 * Showcase products not linked to Techwide's TAP that are in Techwide's campaigns at a higher rate for the creator's level
 * (Bronze: the Open Plan rate; Silver and Gold: the Silver rate). Rates are ×100. Biggest raise first. Products TikTok rejected
 * in the showcase are left out: TikTok won't take them again through any link (owner, 14 Oct 2026).
 */
export function findRaises(showcase: ShowcaseEntry[], catalog: Map<string, TapProduct>, level: "bronze" | "silver" | "gold"): Raise[] {
  const out: Raise[] = [];
  for (const p of showcase) {
    if (TECHWIDE.test(p.collaboration?.partner?.name ?? "")) continue;
    if (p.status?.added_status === "REJECTED" || p.status?.review_status === "UNAVAILABLE") continue;
    const tap = catalog.get(String(p.id));
    if (!tap) continue;
    const tapRate = (level === "bronze" ? tap.openRate : tap.silverRate ?? tap.openRate) ?? 0;
    const nowRate = Number(p.commission?.rate ?? 0);
    if (tapRate > nowRate) out.push({ productId: String(p.id), name: tap.name, shop: tap.shop ?? p.shop?.name ?? "", image: tap.image, price: tap.priceLo, nowRate, tapRate });
  }
  return out.sort((a, b) => b.tapRate - b.nowRate - (a.tapRate - a.nowRate));
}

const cache = new Map<string, { at: number; raises: Raise[] }>();

/** The creator's commission raises (whole showcase, up to TikTok's 2,000), kept 30 minutes; null when TikTok Shop isn't linked. */
export async function commissionRaises(userId: string): Promise<Raise[] | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.raises;
  const token = await approvedCreatorToken(userId);
  if (!token) return null;
  const showcase: ShowcaseEntry[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 100; page++) {
    const r = await getShowcaseProducts(token, pageToken);
    if (r.code !== 0) {
      console.error("[raises] showcase", r.code, r.message);
      return hit?.raises ?? [];
    }
    showcase.push(...((r.data?.products ?? []) as ShowcaseEntry[]));
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  const [catalog, level] = await Promise.all([allProducts(), levelOf(userId)]);
  const raises = findRaises(showcase, new Map(catalog.map((p) => [p.id, p])), level);
  cache.set(userId, { at: Date.now(), raises });
  return raises;
}

/** Bulk Add to Showcase through Techwide's TAP link for the chosen products, one by one; then the raises are read again. */
export async function takeRaises(userId: string, productIds: string[]): Promise<{ added: string[]; failed: { productId: string; error: string }[] }> {
  const added: string[] = [];
  const failed: { productId: string; error: string }[] = [];
  for (const id of productIds.filter((x) => /^\d{6,25}$/.test(x)).slice(0, 50)) {
    const r = await addToShowcase(userId, id);
    if (r.added) added.push(id);
    else failed.push({ productId: id, error: r.error || "TikTok Shop didn't add it." });
  }
  cache.delete(userId);
  return { added, failed };
}
