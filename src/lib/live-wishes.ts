import { LIVE_OFF, type OffLive, type WantedLive } from "./product-view";
import type { Commit } from "./mock-showcase";
import { tx } from "./i18n/lang";

/** Messages shown when the server can't be reached; the page translates them where it shows them (owner, 3 Nov 2026). */
const NOT_FOUND = tx("Couldn't find this product. Check the link.");
const NOT_SAVED = tx("Didn't save. Please try again.");

/** One of her wishes from /api/v2/wishes. */
export type LiveWish = OffLive & { status: "On wish list" | "On Rezekii" | "Seller said no"; at: string; commit: Commit; raise: number | null };

type Found = { product: OffLive; onRezekii: boolean; wanted: WantedLive | null };
const remember = (d: Found) => { if (!d.onRezekii) LIVE_OFF.set(d.product.id, { product: d.product, wanted: d.wanted }); };

/** Finds a pasted TikTok Shop link (or short link) and remembers it for the Product page. */
export async function findWishLink(link: string): Promise<Found | { error: string }> {
  const r = await fetch("/api/v2/wishes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ find: link }) }).catch(() => null);
  const d = (await r?.json().catch(() => null)) as (Found & { error?: string }) | null;
  if (!r?.ok || !d || d.error) return { error: d?.error ?? NOT_FOUND };
  remember(d);
  return d;
}

export async function loadMyWishes(): Promise<LiveWish[] | null> {
  const d = await fetch("/api/v2/wishes?part=mine", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return d?.wishes ?? null;
}

export async function loadBoard(): Promise<WantedLive[] | null> {
  const d = await fetch("/api/v2/wishes?part=board", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  for (const w of (d?.items ?? []) as WantedLive[]) LIVE_OFF.set(w.id, { product: w, wanted: w });
  return d?.items ?? null;
}

export async function saveWishLive(productId: string, commit: Commit): Promise<{ ok?: true; error?: string }> {
  const r = await fetch("/api/v2/wishes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, commit }) }).catch(() => null);
  return (await r?.json().catch(() => null)) ?? { error: NOT_SAVED };
}
