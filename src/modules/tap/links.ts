import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { campaignProductLink } from "../../integrations/tiktok-shop/partner.ts";
import { levelOf } from "../levels/store.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { creatorRateFor, linkTarget } from "./catalog.ts";

export type LinkResult = { ok: true; link: string; name: string; image: string | null } | { ok: false; error: string; status: number };
export type MadeLink = { productId: string; name: string | null; image: string | null; tag: string | null; link: string };

/** Logs links made on Rezekii (for "Links made this week" and the link history). A failed log never fails the link. */
export async function logLinks(userId: string, links: (MadeLink & { level?: string })[]): Promise<void> {
  if (!links.length) return;
  const rows = links.map((l) => ({ user_id: userId, product_id: l.productId, product_name: l.name, image: l.image, tag: l.tag, link: l.link, ...(l.level ? { level: l.level } : {}) }));
  await supabaseRest("tap_links", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify(rows) }).catch((err) =>
    console.error("[link log]", err instanceof Error ? err.message : err),
  );
}

/** A link reused if she made one for this product in the last 6 hours at the same level (owner, 1 Nov 2026: faster Add and Sample). */
const REUSE_MS = 6 * 3600_000;
async function recentLink(userId: string, productId: string, level: string): Promise<string | null> {
  const since = new Date(Date.now() - REUSE_MS).toISOString();
  const res = await supabaseRest(`tap_links?user_id=eq.${userId}&product_id=eq.${productId}&level=eq.${level}&tag=is.null&made_at=gte.${since}&select=link&order=made_at.desc&limit=1`).catch(() => null);
  const [row] = ((await res?.json().catch(() => [])) ?? []) as { link: string }[];
  return row?.link ?? null;
}

/**
 * A TAP promotion link for one product, made with Techwide's partner account (no creator sign-in needed) at the rate for the
 * creator's level, and logged. The product, her level, the partner sign-in and a recent link are read at the same time.
 */
export async function makeTapLink(userId: string, productId: string, level?: Awaited<ReturnType<typeof levelOf>>): Promise<LinkResult> {
  const [target, lv] = await Promise.all([linkTarget(productId), level ?? levelOf(userId)]);
  if (!target) return { ok: false, error: "This product is no longer in the Marketplace.", status: 404 };
  try {
    const [again, partner] = await Promise.all([recentLink(userId, productId, lv), storedSessions().partner()]);
    if (again) return { ok: true, link: again, name: target.name, image: target.image };
    const r = await campaignProductLink(partner.token, partner.cipher, target.campaignId, productId, creatorRateFor(lv, target.openRate, target.totalRate));
    const link = r.data?.product_promotion_link;
    if (r.code !== 0 || !link) return { ok: false, error: `TikTok could not make the link right now (${r.code}). Please try again.`, status: 502 };
    await logLinks(userId, [{ productId, name: target.name, image: target.image, tag: null, link, level: lv }]);
    return { ok: true, link, name: target.name, image: target.image };
  } catch (err) {
    console.error("[tap link]", err instanceof Error ? err.message : err);
    return { ok: false, error: "TikTok could not make the link right now. Please try again.", status: 502 };
  }
}

const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};

/** Links the creator made in the last 7 days and in all. */
export async function linkCounts(userId: string): Promise<{ week: number; all: number }> {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [week, all] = await Promise.all([count(`tap_links?user_id=eq.${userId}&made_at=gte.${weekAgo}&select=id`), count(`tap_links?user_id=eq.${userId}&select=id`)]);
  return { week, all };
}
