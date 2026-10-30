import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getProduct } from "../tap/catalog.ts";
import { lookupLinks } from "../tap/convert.ts";

const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];

/**
 * One product for admins (owner, 31 Oct 2026: real data): Rezekii's catalog record (or TikTok's facts when it isn't on
 * Rezekii), the creators promoting it in Techwide's campaign, creators' wishes for it, and the seller's TAP request.
 */
export async function productAdmin(id: string, token: string | null) {
  if (!/^\d{15,21}$/.test(id)) return null;
  const [cat, creators, wishes, requests] = await Promise.all([
    getProduct(id),
    rows<{ username: string; nick_name: string | null; paid: number; videos: number; lives: number; sample_status: string | null; commission: number | null; as_of: string }>(
      `tap_creator_products?product_id=eq.${id}&select=username,nick_name,paid,videos,lives,sample_status,commission,as_of&order=paid.desc&limit=200`,
    ),
    rows<{ user_id: string; videos: number; lives: number; rights: number; months: number; note: string | null; created_at: string; declined_at: string | null; raise: number | null }>(
      `wishes?product_id=eq.${id}&select=user_id,videos,lives,rights,months,note,created_at,declined_at,raise&order=created_at`,
    ),
    rows<{ id: string; status: string; raise_pct: number | null; samples_per_sku: number | null; reason: string | null; owner_name: string | null; created_at: string; updated_at: string; total_rate: number | null; campaign_id: string | null }>(
      `tap_submissions?product_id=eq.${id}&select=id,status,raise_pct,samples_per_sku,reason,owner_name,created_at,updated_at,total_rate,campaign_id&order=created_at.desc&limit=20`,
    ),
  ]);
  const facts = cat ? null : (await lookupLinks(token, [id]).catch(() => []))[0];
  if (!cat && !facts?.ok && !wishes.length && !requests.length) return null;
  const users = wishes.length ? await rows<{ id: string; display_name: string | null; tiktok_username: string | null }>(`app_users?id=in.(${wishes.map((w) => w.user_id).join(",")})&select=id,display_name,tiktok_username`) : [];
  const who = new Map(users.map((u) => [u.id, u.tiktok_username ? `@${u.tiktok_username}` : u.display_name ?? "Creator"]));
  return {
    product: cat
      ? { id, name: cat.name, shop: cat.shop, image: cat.image, category: cat.category, price: cat.priceLo, sold: cat.sold, openRate: cat.openRate, silverRate: cat.silverRate, stock: cat.stock, onRezekii: true, campaign: cat.campaignName, campaignEnd: cat.campaignEnd, samples: cat.samples > 0 }
      : { id, name: facts?.name ?? "Product", shop: facts?.shop ?? null, image: facts?.image ?? null, category: facts?.category ?? null, price: facts?.priceLo ?? null, sold: facts?.sold ?? null, openRate: facts?.rate ?? null, silverRate: null, stock: facts?.stock ?? null, onRezekii: false, campaign: null, campaignEnd: null, samples: false },
    creators: creators.map((c) => ({ handle: `@${c.username}`, name: c.nick_name, gmv: Number(c.paid) || 0, videos: c.videos, lives: c.lives, sample: c.sample_status, rate: c.commission, asOf: c.as_of })),
    wishes: wishes.map((w) => ({ who: who.get(w.user_id) ?? "Creator", videos: w.videos, lives: w.lives, rights: w.rights, months: w.months, note: w.note, at: w.created_at, declined: !!w.declined_at, raise: w.raise })),
    requests,
  };
}
