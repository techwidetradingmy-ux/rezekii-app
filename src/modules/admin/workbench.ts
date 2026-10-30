import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { codeFor } from "../rewards/referrals.ts";

const DAY = 86_400_000;
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];

/**
 * One staff member's workbench (owner, 31 Oct 2026: real data): their own invite links, who joined through them and how far
 * each got, and the sellers' TAP requests they look after, with follow-ups (waiting over 2 days).
 */
export async function workbench(user: { id: string; display_name: string | null; tiktok_username: string | null }, actor: string, origin: string) {
  const [code, invited, mine] = await Promise.all([
    codeFor(user),
    rows<{ friend_id: string; side: string; joined_at: string | null; qualified_at: string | null }>(`referrals?inviter_id=eq.${user.id}&select=friend_id,side,joined_at,qualified_at&order=joined_at.desc.nullslast&limit=500`),
    rows<{ id: string; shop_id: string; product_name: string | null; status: string; created_at: string; updated_at: string }>(
      `tap_submissions?owner_name=eq.${encodeURIComponent(actor)}&select=id,shop_id,product_name,status,created_at,updated_at&order=updated_at.desc&limit=1000`,
    ),
  ]);
  const ids = invited.map((r) => r.friend_id);
  const [users, links, shops, allShops] = await Promise.all([
    ids.length ? rows<{ id: string; display_name: string | null; tiktok_username: string | null; email: string | null }>(`app_users?id=in.(${ids.join(",")})&select=id,display_name,tiktok_username,email`) : Promise.resolve([]),
    ids.length ? rows<{ user_id: string }>(`affiliate_connections?user_id=in.(${ids.join(",")})&select=user_id`) : Promise.resolve([]),
    ids.length ? rows<{ connected_by: string; shop_id: string; shop_name: string }>(`seller_connections?connected_by=in.(${ids.join(",")})&select=connected_by,shop_id,shop_name`) : Promise.resolve([]),
    rows<{ shop_id: string; shop_name: string }>("seller_connections?select=shop_id,shop_name&limit=2000"),
  ]);
  const name = new Map(users.map((u) => [u.id, u.tiktok_username ? `@${u.tiktok_username}` : u.display_name ?? u.email?.split("@")[0] ?? "Someone"]));
  const linked = new Set(links.map((l) => l.user_id));
  const shopName = new Map(allShops.map((s) => [s.shop_id, s.shop_name]));
  const people = invited.map((r) => {
    const shop = shops.find((s) => s.connected_by === r.friend_id);
    const step = r.side === "seller" ? (shop ? "Connected Seller Center" : "Signed up") : r.qualified_at ? "Linked TikTok Shop" : linked.has(r.friend_id) ? "Linked TikTok Shop" : "Signed up";
    return { name: name.get(r.friend_id) ?? "Someone", side: r.side, joined: r.joined_at, step, counted: !!r.qualified_at, shop: shop?.shop_name ?? null };
  });
  const twoDays = new Date(Date.now() - 2 * DAY).toISOString();
  const byShop = new Map<string, { shop: string; live: number; open: number; declined: number; last: string; late: number }>();
  for (const r of mine) {
    const key = r.shop_id;
    const m = byShop.get(key) ?? byShop.set(key, { shop: shopName.get(key) ?? "Shop", live: 0, open: 0, declined: 0, last: r.updated_at, late: 0 }).get(key)!;
    if (r.status === "live") m.live += 1;
    else if (r.status === "not_approved") m.declined += 1;
    else if (r.status !== "withdrawn") { m.open += 1; if ((r.status === "submitted" || r.status === "in_review") && r.created_at < twoDays) m.late += 1; }
    if (r.updated_at > m.last) m.last = r.updated_at;
  }
  const follow = mine.filter((r) => (r.status === "submitted" || r.status === "in_review") && r.created_at < twoDays).map((r) => ({ id: r.id, product: r.product_name ?? "Product", shop: shopName.get(r.shop_id) ?? "Shop", since: r.created_at }));
  return {
    links: { creator: `${origin}/r/${code}`, seller: `${origin}/s/${code}`, code },
    people,
    merchants: [...byShop.values()].sort((a, b) => b.late - a.late || b.open - a.open || b.live - a.live),
    follow,
  };
}
