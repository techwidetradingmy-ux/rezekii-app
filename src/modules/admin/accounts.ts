import { supabaseRest } from "../../integrations/supabase/rest.ts";

export type AdminAccount = {
  openId: string;
  handle: string;
  avatar: string | null;
  ownerId: string;
  owner: string;
  techwide: boolean;
  shop: boolean;
  /** "ok" | "expired" (TikTok's refresh token ran out: the owner must sign in with TikTok again) */
  tiktok: "ok" | "expired";
  queued: number;
  links30: number;
  connectedAt: string;
};

type Conn = { open_id: string; user_id: string; username: string | null; display_name: string | null; avatar_url: string | null; refresh_token_expires_at: string; connected_at: string };
type User = { id: string; role: "admin" | "creator"; display_name: string | null; email: string | null };

/** Every TikTok account connected to Rezekii: Techwide's own (held by admins) and creators'. */
export async function allAccounts(): Promise<AdminAccount[]> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [conns, users, shops, queued, links] = await Promise.all([
    supabaseRest("tiktok_connections?select=open_id,user_id,username,display_name,avatar_url,refresh_token_expires_at,connected_at&order=connected_at&limit=2000").then((r) => r.json() as Promise<Conn[]>),
    supabaseRest("app_users?select=id,role,display_name,email&limit=5000").then((r) => r.json() as Promise<User[]>),
    supabaseRest("affiliate_connections?select=username&limit=2000").then((r) => r.json() as Promise<{ username: string }[]>),
    supabaseRest("posts?status=in.(scheduled,publishing,processing)&select=tiktok_open_id&limit=10000").then((r) => r.json() as Promise<{ tiktok_open_id: string }[]>),
    supabaseRest(`tap_links?made_at=gte.${since}&select=user_id&limit=100000`).then((r) => r.json() as Promise<{ user_id: string }[]>),
  ]);
  const byUser = new Map(users.map((u) => [u.id, u]));
  const shopSet = new Set(shops.map((s) => s.username.toLowerCase()));
  const tally = <T,>(rows: T[], key: (r: T) => string) => rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>());
  const q = tally(queued, (r) => r.tiktok_open_id);
  const l = tally(links, (r) => r.user_id);
  return conns.map((c) => {
    const u = byUser.get(c.user_id);
    const techwide = u?.role === "admin";
    const handle = c.username ? `@${c.username}` : (c.display_name ?? "TikTok account");
    return {
      openId: c.open_id,
      handle,
      avatar: c.avatar_url,
      ownerId: c.user_id,
      owner: techwide ? "Techwide" : `Creator · ${u?.display_name || u?.email || handle}`,
      techwide,
      shop: !!c.username && shopSet.has(c.username.toLowerCase()),
      tiktok: Date.parse(c.refresh_token_expires_at) < Date.now() ? "expired" : "ok",
      queued: q.get(c.open_id) ?? 0,
      // Links are made by the Rezekii account; a creator has one TikTok account, so they are shown on it.
      links30: techwide ? 0 : (l.get(c.user_id) ?? 0),
      connectedAt: c.connected_at,
    };
  });
}

/** How many TikTok Shop places the Partner Center app has used (it allows 25 while in beta). */
export async function shopPlacesUsed(): Promise<number> {
  const res = await supabaseRest("affiliate_connections?select=username", { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
}
