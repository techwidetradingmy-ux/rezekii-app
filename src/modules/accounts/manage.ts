import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { revokeTikTokToken } from "../../integrations/tiktok/login.ts";
import { decryptToken } from "../creator-accounts/token-crypto.ts";
import { deleteUpload } from "../posting/media.ts";
import { accessFor, inviteNext, type AccessStatus } from "../creator-accounts/access.ts";
import { myTapRows } from "../tap/mytap.ts";
import type { AppUser } from "./users.ts";

export type AccountOverview = {
  joined: string;
  /** How the account signs in: "TikTok · @handle", "Google · email", "email · address" */
  signIn: string[];
  tiktok: { username: string | null; connectedAt: string } | null;
  /** The TikTok Shop link and where its approval stands ("none" = never linked). */
  shop: { status: AccessStatus | "none"; reason: string | null; position: number | null; linked: boolean; handle: string | null };
  linksThisWeek: number;
  showcase: number;
};

const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

/**
 * What Account shows: sign-in methods, the TikTok posting connection, the TikTok Shop link and this week's numbers.
 * `tapRows`: the creator's My TAP rows when the caller already reads them (the Account page).
 */
export async function accountOverview(user: AppUser, tapRows?: ReturnType<typeof myTapRows>): Promise<AccountOverview> {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [[row], hasPassword, [conn], shop, links, tap] = await Promise.all([
    supabaseRest(`app_users?id=eq.${user.id}&select=google_sub,created_at`).then((r) => r.json() as Promise<{ google_sub: string | null; created_at: string }[]>),
    count(`app_users?id=eq.${user.id}&password_hash=not.is.null&select=id`),
    supabaseRest(`tiktok_connections?user_id=eq.${user.id}&select=username,connected_at&order=updated_at.desc&limit=1`).then((r) => r.json() as Promise<{ username: string | null; connected_at: string }[]>),
    Promise.all([
      accessFor(user.id),
      supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=username&limit=1`).then((r) => r.json() as Promise<{ username: string }[]>),
    ]),
    count(`tap_links?user_id=eq.${user.id}&made_at=gte.${weekAgo}&select=id`),
    tapRows ?? myTapRows(user.id, user.tiktok_username),
  ]);
  const signIn = [
    ...(user.tiktok_open_id ? [`TikTok${user.tiktok_username ? ` · @${user.tiktok_username}` : ""}`] : []),
    ...(row?.google_sub ? [`Google${user.email ? ` · ${user.email}` : ""}`] : []),
    ...(hasPassword && user.email ? [`email · ${user.email}`] : []),
  ];
  return {
    joined: row ? day(row.created_at) : "",
    signIn,
    tiktok: conn ? { username: conn.username, connectedAt: day(conn.connected_at) } : null,
    shop: { status: shop[0]?.status ?? "none", reason: shop[0]?.reason ?? null, position: shop[0]?.position ?? null, linked: !!shop[1][0], handle: shop[1][0]?.username ?? null },
    linksThisWeek: links,
    showcase: tap.rows.filter((r) => r.campaignId).length,
  };
}

async function revokeAll(userId: string): Promise<string[]> {
  const conns = (await (await supabaseRest(`tiktok_connections?user_id=eq.${userId}&select=open_id,access_token_enc`)).json()) as { open_id: string; access_token_enc: string }[];
  for (const c of conns) {
    try {
      await revokeTikTokToken(decryptToken(c.access_token_enc));
    } catch (err) {
      console.error("[account] revoke failed", err instanceof Error ? err.message : err);
    }
  }
  return conns.map((c) => c.open_id);
}

/**
 * Disconnect TikTok: Rezekii's access is revoked at TikTok and the posting connection deleted. Posts still waiting to go out
 * move back to drafts. Signing in with TikTok later connects it again.
 */
export async function disconnectTikTok(userId: string): Promise<{ drafts: number }> {
  const openIds = await revokeAll(userId);
  const res = await supabaseRest(`posts?user_id=eq.${userId}&status=eq.scheduled&select=id`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "draft", next_attempt_at: null, updated_at: new Date().toISOString() }),
  });
  const drafts = ((await res.json()) as unknown[]).length;
  if (openIds.length) await supabaseRest(`tiktok_connections?user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  return { drafts };
}

/**
 * Deletes the Rezekii account and everything in it: TikTok access is revoked, uploaded videos are removed from storage, the
 * TikTok Shop connection for the handle is dropped, and the account row goes (sessions, posts, samples, links and level go with it).
 * Techwide's TAP campaign records about the creator stay, as they come from TikTok Shop and not from Rezekii.
 */
export async function deleteAccount(user: AppUser): Promise<void> {
  await revokeAll(user.id);
  const uploads = (await (await supabaseRest(`posts?user_id=eq.${user.id}&storage_path=not.is.null&select=storage_path`)).json()) as { storage_path: string }[];
  for (const u of uploads) await deleteUpload(u.storage_path).catch((err) => console.error("[account] upload delete failed", err instanceof Error ? err.message : err));
  await supabaseRest(`affiliate_connections?user_id=eq.${user.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  if (user.tiktok_username) await supabaseRest(`affiliate_connections?username=eq.${encodeURIComponent(user.tiktok_username)}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await supabaseRest(`app_users?id=eq.${user.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  // Their TikTok Shop place is free again for the next creator on the waitlist.
  await inviteNext().catch(() => null);
}
