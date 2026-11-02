import { getShowcaseProducts } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { levelOf } from "../levels/store.ts";
import { allProducts, type TapProduct } from "./catalog.ts";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { addManyToShowcase, saveRead } from "./showcase.ts";

/** A product in the creator's showcase that pays more through Techwide's TAP campaign than it pays them now. */
export type Raise = { productId: string; name: string; shop: string; image: string | null; price: number | null; nowRate: number; tapRate: number };

/** What TikTok's showcase list says about one product (the fields Rezekii reads). */
export type ShowcaseEntry = {
  id: string; title?: string; commission?: { rate?: number }; collaboration?: { partner?: { id?: string; name?: string } }; shop?: { name?: string };
  /** e.g. { added_status: "REJECTED", review_status: "UNAVAILABLE" } for a product TikTok refused in this showcase. */
  status?: { added_status?: string; review_status?: string };
  main_images?: { url?: string }[];
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

/** The creator's commission raises from her last scan; null before her first scan or when TikTok Shop isn't linked. */
export async function commissionRaises(userId: string): Promise<Raise[] | null> {
  return (await showcaseScan(userId))?.raises ?? null;
}

/** The last showcase check, shared by every server through the database (reading a big showcase takes TikTok ~45 seconds). */
const scanKey = (userId: string) => `showcase_scan:${userId}`;
async function savedScan(userId: string): Promise<{ at: number; raises: Raise[]; matches: Raise[] } | null> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${encodeURIComponent(scanKey(userId))}&select=value&limit=1`)).json()) as { value: { at: number; raises: Raise[]; matches: Raise[] } | null }[];
  return row?.value?.at ? row.value : null;
}
async function saveScan(userId: string, value: { at: number; raises: Raise[]; matches: Raise[] }) {
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: scanKey(userId), value, updated_at: new Date().toISOString() }) });
}

/**
 * Her showcase scan (owner, 2 Nov 2026: it scans only when she taps Scan). Without `scan`, the last scan whatever its age, or
 * null before her first one. With `scan`, every page of her showcase is read from TikTok now; that one read also saves her
 * showcase count and list. `count`: her showcase size at that scan.
 */
export async function showcaseScan(userId: string, scan = false): Promise<{ at: number; raises: Raise[]; matches: Raise[]; count?: number } | null> {
  const last = await savedScan(userId).catch(() => null);
  if (!scan) return last;
  const token = await approvedCreatorToken(userId);
  if (!token) return null;
  const showcase: ShowcaseEntry[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 250; page++) {
    const r = await getShowcaseProducts(token, pageToken);
    if (r.code !== 0) {
      console.error("[raises] showcase", r.code, r.message);
      if (!page) return last;
      break;
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
  const items = showcase.map((p) => ({ id: p.id, name: p.title ?? "Product", img: p.main_images?.[0]?.url ?? null }));
  await Promise.all([saveScan(userId, out).catch(() => undefined), saveRead(userId, { items, more: !!pageToken }).catch(() => undefined)]);
  return { ...out, count: showcase.length };
}

/** Bulk Add to Showcase through Techwide's TAP link for the chosen products, one by one; added ones leave her saved scan. */
export async function takeRaises(userId: string, productIds: string[]): Promise<{ added: string[]; failed: { productId: string; error: string }[] }> {
  const results = await addManyToShowcase(userId, productIds.filter((x) => /^\d{6,25}$/.test(x)).slice(0, 50));
  const added = results.filter((x) => x.result.added).map((x) => x.productId);
  const failed = results.flatMap((x) => (x.result.added ? [] : [{ productId: x.productId, error: x.result.error || "TikTok Shop didn't add it." }]));
  await noteRefused(userId, failed.filter((f) => REFUSED.test(f.error)).map((f) => f.productId)).catch(() => undefined);
  // No new scan (owner, 2 Nov 2026: only when she taps Scan): what was added, or refused, simply leaves the saved one.
  const done = new Set([...added, ...failed.filter((f) => REFUSED.test(f.error)).map((f) => f.productId)]);
  const last = await savedScan(userId).catch(() => null);
  if (last && done.size) await saveScan(userId, { at: last.at, raises: last.raises.filter((r) => !done.has(r.productId)), matches: last.matches.filter((r) => !done.has(r.productId)) }).catch(() => undefined);
  return { added, failed };
}
