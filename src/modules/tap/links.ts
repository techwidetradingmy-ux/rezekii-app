import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { campaignProductLink } from "../../integrations/tiktok-shop/partner.ts";
import { levelOf } from "../levels/store.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { creatorRateFor, linkTarget } from "./catalog.ts";

export type LinkResult = { ok: true; link: string; name: string; image: string | null } | { ok: false; error: string; status: number };
export type MadeLink = { productId: string; name: string | null; image: string | null; tag: string | null; link: string };

/** Logs links made on Rezekii (for "Links made this week" and the link history). A failed log never fails the link. */
export async function logLinks(userId: string, links: MadeLink[]): Promise<void> {
  if (!links.length) return;
  const rows = links.map((l) => ({ user_id: userId, product_id: l.productId, product_name: l.name, image: l.image, tag: l.tag, link: l.link }));
  await supabaseRest("tap_links", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify(rows) }).catch((err) =>
    console.error("[link log]", err instanceof Error ? err.message : err),
  );
}

/**
 * A TAP promotion link for one product, made with Techwide's partner account (no creator sign-in needed) at the rate for the
 * creator's level, and logged.
 */
export async function makeTapLink(userId: string, productId: string, level?: Awaited<ReturnType<typeof levelOf>>): Promise<LinkResult> {
  const target = await linkTarget(productId);
  if (!target) return { ok: false, error: "This product is no longer in the Marketplace.", status: 404 };
  try {
    const partner = await storedSessions().partner();
    const r = await campaignProductLink(partner.token, partner.cipher, target.campaignId, productId, creatorRateFor(level ?? (await levelOf(userId)), target.openRate, target.totalRate));
    const link = r.data?.product_promotion_link;
    if (r.code !== 0 || !link) return { ok: false, error: `TikTok could not make the link right now (${r.code}). Please try again.`, status: 502 };
    await logLinks(userId, [{ productId, name: target.name, image: target.image, tag: null, link }]);
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
