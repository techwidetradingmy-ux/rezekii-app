import { getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { levelOf } from "../levels/store.ts";
import { allProducts, type TapProduct } from "./catalog.ts";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { addManyToShowcase } from "./showcase.ts";

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
  return findMatches(showcase, catalog, level).filter((r) => r.tapRate > r.nowRate).sort((a, b) => b.tapRate - b.nowRate - (a.tapRate - a.nowRate));
}

/**
 * Showcase products also in the Rezekii Marketplace but not added through Techwide's TAP, whatever they pay: their sales don't
 * count toward the creator's Rezekii level until the Rezekii version is added (Levels, "Get there faster", owner 14 Oct 2026).
 */
export function findMatches(showcase: ShowcaseEntry[], catalog: Map<string, TapProduct>, level: "bronze" | "silver" | "gold"): Raise[] {
  const out: Raise[] = [];
  for (const p of showcase) {
    if (TECHWIDE.test(p.collaboration?.partner?.name ?? "")) continue;
    if (p.status?.added_status === "REJECTED" || p.status?.review_status === "UNAVAILABLE") continue;
    const tap = catalog.get(String(p.id));
    if (!tap) continue;
    const tapRate = (level === "bronze" ? tap.openRate : tap.silverRate ?? tap.openRate) ?? 0;
    out.push({ productId: String(p.id), name: tap.name, shop: tap.shop ?? p.shop?.name ?? "", image: tap.image, price: tap.priceLo, nowRate: Number(p.commission?.rate ?? 0), tapRate });
  }
  return out;
}

const cache = new Map<string, { at: number; raises: Raise[]; matches: Raise[] }>();

/** How long a product TikTok refused to add for a creator stays out of their raises. */
const REFUSED_DAYS = 30;
/** TikTok's refusal for a product it won't take into this creator's showcase ("Adding product failed. Please contact TikTok.").*/
const REFUSED = /adding product failed/i;

/** Products TikTok refused to add for this creator in the last REFUSED_DAYS days: { productId: when }. */
export async function refusedProducts(userId: string): Promise<Record<string, string>> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${encodeURIComponent(`showcase_refused:${userId}`)}&select=value&limit=1`)).json()) as { value: Record<string, string> }[];
  const since = Date.now() - REFUSED_DAYS * 86_400_000;
  return Object.fromEntries(Object.entries(row?.value ?? {}).filter(([, at]) => Date.parse(at) > since));
}

async function noteRefused(userId: string, ids: string[]) {
  if (!ids.length) return;
  const now = new Date().toISOString();
  const value = { ...(await refusedProducts(userId)), ...Object.fromEntries(ids.map((id) => [id, now])) };
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: `showcase_refused:${userId}`, value, updated_at: now }) });
}

/** The creator's commission raises (whole showcase, up to TikTok's 2,000), kept 30 minutes; null when TikTok Shop isn't linked. */
export async function commissionRaises(userId: string): Promise<Raise[] | null> {
  return (await showcaseVsTap(userId))?.raises ?? null;
}

/** Showcase products also in the Rezekii Marketplace, not added through Rezekii; null when TikTok Shop isn't linked. */
export async function rezekiiMatches(userId: string): Promise<Raise[] | null> {
  return (await showcaseVsTap(userId))?.matches ?? null;
}

/** The last showcase check, shared by every server through the database (reading a big showcase takes TikTok ~20 seconds). */
const scanKey = (userId: string) => `showcase_scan:${userId}`;
async function savedScan(userId: string): Promise<{ at: number; raises: Raise[]; matches: Raise[] } | null> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${encodeURIComponent(scanKey(userId))}&select=value&limit=1`)).json()) as { value: { at: number; raises: Raise[]; matches: Raise[] } | null }[];
  return row?.value && Date.now() - row.value.at < 30 * 60_000 ? row.value : null;
}
async function saveScan(userId: string, value: { at: number; raises: Raise[]; matches: Raise[] }) {
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: scanKey(userId), value, updated_at: new Date().toISOString() }) });
}

async function showcaseVsTap(userId: string): Promise<{ raises: Raise[]; matches: Raise[] } | null> {
  const fresh = (x: { at: number } | null | undefined) => !!x && Date.now() - x.at < 30 * 60_000;
  const mem = cache.get(userId);
  if (fresh(mem)) return mem!;
  const hit = await savedScan(userId).catch(() => null);
  if (hit) {
    cache.set(userId, hit);
    return hit;
  }
  const token = await approvedCreatorToken(userId);
  if (!token) return null;
  const showcase: ShowcaseEntry[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 100; page++) {
    const r = await getShowcaseProducts(token, pageToken);
    if (r.code !== 0) {
      console.error("[raises] showcase", r.code, r.message);
      return mem ?? { raises: [], matches: [] };
    }
    showcase.push(...((r.data?.products ?? []) as ShowcaseEntry[]));
    pageToken = r.data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  const [catalog, level, refused] = await Promise.all([allProducts(), levelOf(userId), refusedProducts(userId)]);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const raises = findRaises(showcase, byId, level).filter((r) => !refused[r.productId]);
  const matches = findMatches(showcase, byId, level).filter((r) => !refused[r.productId]);
  const out = { at: Date.now(), raises, matches };
  cache.set(userId, out);
  await saveScan(userId, out).catch(() => undefined);
  return out;
}

/** Bulk Add to Showcase through Techwide's TAP link for the chosen products, one by one; then the raises are read again. */
export async function takeRaises(userId: string, productIds: string[]): Promise<{ added: string[]; failed: { productId: string; error: string }[] }> {
  const results = await addManyToShowcase(userId, productIds.filter((x) => /^\d{6,25}$/.test(x)).slice(0, 50));
  const added = results.filter((x) => x.result.added).map((x) => x.productId);
  const failed = results.flatMap((x) => (x.result.added ? [] : [{ productId: x.productId, error: x.result.error || "TikTok Shop didn't add it." }]));
  await noteRefused(userId, failed.filter((f) => REFUSED.test(f.error)).map((f) => f.productId)).catch(() => undefined);
  cache.delete(userId);
  await saveScan(userId, { at: 0, raises: [], matches: [] }).catch(() => undefined);
  return { added, failed };
}
