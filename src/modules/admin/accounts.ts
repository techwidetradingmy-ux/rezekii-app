import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { revokeTikTokToken } from "../../integrations/tiktok/login.ts";
import { decryptToken } from "../creator-accounts/token-crypto.ts";
import { photoFor, savedPhotos } from "../photos/store.ts";
import { logActivity } from "./admins.ts";

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
  const [conns, users, shops, queued, links, saved] = await Promise.all([
    supabaseRest("tiktok_connections?select=open_id,user_id,username,display_name,avatar_url,refresh_token_expires_at,connected_at&order=connected_at&limit=2000").then((r) => r.json() as Promise<Conn[]>),
    supabaseRest("app_users?select=id,role,display_name,email&limit=5000").then((r) => r.json() as Promise<User[]>),
    supabaseRest("affiliate_connections?select=username&limit=2000").then((r) => r.json() as Promise<{ username: string }[]>),
    supabaseRest("posts?status=in.(scheduled,publishing,processing)&select=tiktok_open_id&limit=10000").then((r) => r.json() as Promise<{ tiktok_open_id: string }[]>),
    supabaseRest(`tap_links?made_at=gte.${since}&select=user_id&limit=100000`).then((r) => r.json() as Promise<{ user_id: string }[]>),
    savedPhotos().catch(() => new Map<string, string>()),
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
      // TikTok's photo addresses stop working within ~2 days: Rezekii's saved copy, else the address while it works.
      avatar: photoFor(c.username ?? "", c.avatar_url, saved),
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

/**
 * Removes a Techwide team account: Rezekii's TikTok access is revoked, the connection deleted and its queued posts cancelled.
 * Its posted videos and link history stay as business records.
 */
export async function removeTeamAccount(openId: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const [c] = (await (await supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(openId)}&select=user_id,username,access_token_enc&limit=1`)).json()) as { user_id: string; username: string | null; access_token_enc: string }[];
  if (!c) return { ok: false, error: "That account is no longer connected." };
  const [owner] = (await (await supabaseRest(`app_users?id=eq.${c.user_id}&select=role,tiktok_open_id&limit=1`)).json()) as { role: string; tiktok_open_id: string | null }[];
  if (owner?.role !== "admin") return { ok: false, error: "That is a creator's account. Remove it from Creators instead." };
  await Promise.resolve().then(() => revokeTikTokToken(decryptToken(c.access_token_enc))).catch((err) => console.error("[accounts] revoke failed", err instanceof Error ? err.message : err));
  await supabaseRest(`posts?tiktok_open_id=eq.${encodeURIComponent(openId)}&status=in.(scheduled,failed)`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled", next_attempt_at: null, updated_at: new Date().toISOString() }) });
  await supabaseRest(`tiktok_connections?open_id=eq.${encodeURIComponent(openId)}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  if (owner.tiktok_open_id === openId) await supabaseRest(`app_users?id=eq.${c.user_id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ tiktok_open_id: null, tiktok_username: null }) });
  await logActivity(actor, "Connections", `removed @${c.username ?? openId} from Rezekii`);
  return { ok: true };
}
