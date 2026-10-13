import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { campaignProductLink } from "../../integrations/tiktok-shop/partner.ts";
import { levelOf } from "../levels/store.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { creatorRateFor, linkTarget } from "./catalog.ts";

export type LinkResult = { ok: true; link: string } | { ok: false; error: string; status: number };

/**
 * A TAP promotion link for one product, made with Techwide's partner account (no creator sign-in needed) at the rate for the
 * creator's level, and logged for "Links made this week".
 */
export async function makeTapLink(userId: string, productId: string): Promise<LinkResult> {
  const target = await linkTarget(productId);
  if (!target) return { ok: false, error: "This product is no longer in a Techwide TAP campaign.", status: 404 };
  try {
    const partner = await storedSessions().partner();
    const r = await campaignProductLink(partner.token, partner.cipher, target.campaignId, productId, creatorRateFor(await levelOf(userId), target.openRate, target.totalRate));
    const link = r.data?.product_promotion_link;
    if (r.code !== 0 || !link) return { ok: false, error: `TikTok could not make the link right now (${r.code}). Please try again.`, status: 502 };
    await supabaseRest("tap_links", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ user_id: userId, product_id: productId, link }) }).catch((err) =>
      console.error("[tap link log]", err instanceof Error ? err.message : err),
    );
    return { ok: true, link };
  } catch (err) {
    console.error("[tap link]", err instanceof Error ? err.message : err);
    return { ok: false, error: "TikTok could not make the link right now. Please try again.", status: 502 };
  }
}

const isTikTok = (u: URL) => u.protocol === "https:" && (u.hostname === "tiktok.com" || u.hostname.endsWith(".tiktok.com"));

/** The product id in a TikTok Shop product link (".../product/1730958349688804006", "?product_id=..."), or null. */
export function productIdFromUrl(text: string): string | null {
  let u: URL;
  try {
    u = new URL(text.trim());
  } catch {
    return null;
  }
  if (!isTikTok(u)) return null;
  const m = u.pathname.match(/\/product\/(\d{6,25})(?:\/|$)/);
  if (m) return m[1];
  const q = u.searchParams.get("product_id") ?? u.searchParams.get("productId");
  return q && /^\d{6,25}$/.test(q) ? q : null;
}

/** Same, but follows TikTok short links (vt.tiktok.com/..., www.tiktok.com/t/...) a few hops. Only TikTok hosts are fetched. */
export async function resolveProductId(text: string): Promise<string | null> {
  let url = text.trim();
  for (let hop = 0; hop < 4; hop++) {
    const id = productIdFromUrl(url);
    if (id) return id;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (!isTikTok(u)) return null;
    try {
      const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "user-agent": "Mozilla/5.0 (Rezekii link check)" } });
      const next = res.headers.get("location");
      if (!next) return null;
      url = new URL(next, u).toString();
    } catch {
      return null;
    }
  }
  return null;
}
