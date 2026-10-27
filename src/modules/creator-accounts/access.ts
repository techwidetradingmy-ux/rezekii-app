import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TokenSet } from "../../integrations/tiktok-shop/auth.ts";
import { logActivity } from "../admin/admins.ts";
import { connectionForUser, freshCreatorToken, isAllowedDuringProof, saveAffiliateConnection } from "./affiliate-connections.ts";

export type AccessStatus = "waiting" | "approved" | "rejected" | "waitlist" | "invited";
export type Access = { status: AccessStatus; reason: string | null; requestedAt: string; decidedAt: string | null; position: number | null };
export type LinkResult = "connected" | "waiting" | "waitlist" | "taken";

const json = (body: unknown, prefer = "resolution=merge-duplicates,return=minimal"): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });
const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};
const now = () => new Date().toISOString();

/** Where one creator stands, with their place in the waitlist. */
export async function accessFor(userId: string): Promise<Access | null> {
  const [row] = (await (await supabaseRest(`creator_access?user_id=eq.${userId}&select=status,reason,requested_at,decided_at&limit=1`)).json()) as { status: AccessStatus; reason: string | null; requested_at: string; decided_at: string | null }[];
  if (!row) return null;
  const position = row.status === "waitlist" ? (await count(`creator_access?status=eq.waitlist&requested_at=lt.${encodeURIComponent(row.requested_at)}&select=user_id`)) + 1 : null;
  return { status: row.status, reason: row.reason, requestedAt: row.requested_at, decidedAt: row.decided_at, position };
}

/** "Approve new creators automatically" (admin Creators). Off unless an admin turns it on. */
export async function autoApprove(): Promise<boolean> {
  const [row] = (await (await supabaseRest("app_settings?key=eq.creators_auto_approve&select=value&limit=1")).json()) as { value: boolean }[];
  return row?.value === true;
}

export async function setAutoApprove(on: boolean, userId: string, actor: string): Promise<void> {
  await supabaseRest("app_settings?on_conflict=key", json({ key: "creators_auto_approve", value: on, updated_at: now(), updated_by: userId }));
  await logActivity(actor, "Creators", on ? "turned on automatic approval for new creators" : "turned off automatic approval for new creators");
}

/**
 * Never full: TikTok approved Rezekii's Shop app (Oct 2026), which lifted the 25-creator beta limit.
 * Kept so the waitlist screens from the beta still compile; nobody reaches them now.
 */
export async function placesFull(): Promise<boolean> {
  return false;
}

/** Joins the waitlist without linking (every place is taken). Keeps an earlier place in the queue. */
export async function joinWaitlist(user: { id: string; tiktok_username: string | null }): Promise<"waitlist" | "free"> {
  if (!(await placesFull())) return "free";
  const current = await accessFor(user.id);
  await supabaseRest("creator_access?on_conflict=user_id", json({ user_id: user.id, status: "waitlist", username: user.tiktok_username?.toLowerCase() ?? null, reason: null, requested_at: current?.status === "waitlist" ? current.requestedAt : now(), decided_at: null, decided_by: null }));
  return "waitlist";
}

/**
 * A signed-in creator came back from TikTok Shop. Saves the link and sets them waiting, or approved when they were approved
 * before, automatic approval is on, or the handle is on the pre-approved list. There is no limit on linked creators.
 */
export async function linkCreator(user: { id: string; role?: string; tiktok_username: string | null }, profile: { openId: string; username: string; avatarUrl?: string }, tokens: TokenSet): Promise<LinkResult> {
  const [holder] = (await (await supabaseRest(`affiliate_connections?creator_user_open_id=eq.${encodeURIComponent(profile.openId)}&select=user_id&limit=1`)).json()) as { user_id: string | null }[];
  if (holder?.user_id && holder.user_id !== user.id) return "taken";
  const current = await accessFor(user.id);
  const handle = profile.username.toLowerCase();
  await saveAffiliateConnection({ ...profile, userId: user.id }, tokens);
  // An email or Google account takes the TikTok handle from TikTok Shop, so its TAP sales and samples show up.
  if (!user.tiktok_username) await supabaseRest(`app_users?id=eq.${user.id}&tiktok_username=is.null`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ tiktok_username: handle }) });
  // Accounts with admin access don't wait for approval.
  const approved = current?.status === "approved" || user.role === "admin" || isAllowedDuringProof(handle) || (await autoApprove());
  await supabaseRest("creator_access?on_conflict=user_id", json({
    user_id: user.id, status: approved ? "approved" : "waiting", username: handle, reason: null,
    requested_at: current?.status === "approved" ? current.requestedAt : now(),
    decided_at: approved ? (current?.decidedAt ?? now()) : null,
    decided_by: approved && current?.status !== "approved" ? (user.role === "admin" ? "admin account" : isAllowedDuringProof(handle) ? "pre-approved handle" : "automatic approval") : null,
  }));
  return approved ? "connected" : "waiting";
}

/** The next creator left on the beta waitlist is invited to link. Returns their handle, or null. */
export async function inviteNext(): Promise<string | null> {
  const [next] = (await (await supabaseRest("creator_access?status=eq.waitlist&select=user_id,username&order=requested_at&limit=1")).json()) as { user_id: string; username: string | null }[];
  if (!next) return null;
  await supabaseRest(`creator_access?user_id=eq.${next.user_id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "invited", decided_at: now(), decided_by: "waitlist" }) });
  return next.username ? `@${next.username}` : "the next creator";
}

/**
 * Approve or reject a creator. Rejecting drops their TikTok Shop link (freeing the place), keeps the reason for them to see,
 * and invites the next creator on the waitlist. They can link again later to ask again.
 */
export async function decideCreator(userId: string, approve: boolean, reason: string | null, actor: string): Promise<{ ok: boolean; invited: string | null }> {
  const [row] = (await (await supabaseRest(`creator_access?user_id=eq.${userId}&select=status,username&limit=1`)).json()) as { status: AccessStatus; username: string | null }[];
  if (!row) return { ok: false, invited: null };
  const who = row.username ? `@${row.username}` : "a creator";
  if (approve) {
    await supabaseRest(`creator_access?user_id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "approved", reason: null, decided_at: now(), decided_by: actor }) });
    await logActivity(actor, "Creators", `approved ${who}`);
    return { ok: true, invited: null };
  }
  await supabaseRest(`creator_access?user_id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "rejected", reason, decided_at: now(), decided_by: actor }) });
  await supabaseRest(`affiliate_connections?user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await logActivity(actor, "Creators", `rejected ${who}${reason ? `: ${reason}` : ""}`);
  return { ok: true, invited: await inviteNext() };
}

/** The creator unlinks TikTok Shop themselves: the link and their approval go, and the next creator on the waitlist is invited. */
export async function unlinkCreator(userId: string, username: string | null): Promise<void> {
  await supabaseRest(`affiliate_connections?user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await supabaseRest(`creator_access?user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  await logActivity(username ? `@${username}` : "A creator", "Creators", "unlinked their TikTok Shop");
  await inviteNext();
}

/** Where a creator's TikTok Shop link stands. Rezekii works without it; affiliate links, showcase and samples need "ready". */
export type ShopStatus = "ready" | "none" | "waiting" | "waitlist" | "invited" | "rejected";

export async function shopStatus(userId: string): Promise<ShopStatus> {
  const [access, linked] = await Promise.all([accessFor(userId), count(`affiliate_connections?user_id=eq.${userId}&select=user_id`)]);
  if (linked > 0) return access?.status === "approved" ? "ready" : "waiting";
  return access?.status === "waitlist" || access?.status === "invited" || access?.status === "rejected" ? access.status : "none";
}

/** The TikTok Shop token of an approved creator, or null (not linked, not approved yet, or it could not be renewed). */
export async function approvedCreatorToken(userId: string): Promise<string | null> {
  const access = await accessFor(userId);
  if (access?.status !== "approved") return null;
  try {
    return await freshCreatorToken(await connectionForUser(userId));
  } catch (err) {
    // A stored token that can't be read or renewed counts as not linked, rather than breaking the page.
    console.error("[creator token]", err instanceof Error ? err.message : err);
    return null;
  }
}
