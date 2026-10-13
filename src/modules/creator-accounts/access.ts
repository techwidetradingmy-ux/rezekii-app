import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { TokenSet } from "../../integrations/tiktok-shop/auth.ts";
import { logActivity } from "../admin/admins.ts";
import { connectionForUser, freshCreatorToken, isAllowedDuringProof, saveAffiliateConnection } from "./affiliate-connections.ts";

/** Rezekii's Partner Center app allows 25 linked creators while it is in beta. */
export const PLACES = 25;

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

/** Places taken: linked creators, plus invitations still open (an invited creator's place is kept for them). */
async function placesTaken(exceptUser: string): Promise<number> {
  const [linked, invited] = await Promise.all([count("affiliate_connections?select=creator_user_open_id"), count(`creator_access?status=eq.invited&user_id=neq.${exceptUser}&select=user_id`)]);
  return linked + invited;
}

/**
 * A signed-in creator came back from TikTok Shop. Saves the link if a place is free (or theirs already) and sets them waiting,
 * or approved when they were approved before, automatic approval is on, or the handle is on the pre-approved list.
 * With every place taken they join the waitlist and nothing is saved.
 */
export async function linkCreator(user: { id: string; tiktok_username: string | null }, profile: { openId: string; username: string; avatarUrl?: string }, tokens: TokenSet): Promise<LinkResult> {
  const [holder] = (await (await supabaseRest(`affiliate_connections?creator_user_open_id=eq.${encodeURIComponent(profile.openId)}&select=user_id&limit=1`)).json()) as { user_id: string | null }[];
  if (holder?.user_id && holder.user_id !== user.id) return "taken";
  const current = await accessFor(user.id);
  const handle = profile.username.toLowerCase();
  if (!holder && current?.status !== "invited" && (await placesTaken(user.id)) >= PLACES) {
    await supabaseRest("creator_access?on_conflict=user_id", json({ user_id: user.id, status: "waitlist", username: handle, reason: null, requested_at: current?.status === "waitlist" ? current.requestedAt : now(), decided_at: null, decided_by: null }));
    return "waitlist";
  }
  await saveAffiliateConnection({ ...profile, userId: user.id }, tokens);
  // An email or Google account takes the TikTok handle from TikTok Shop, so its TAP sales and samples show up.
  if (!user.tiktok_username) await supabaseRest(`app_users?id=eq.${user.id}&tiktok_username=is.null`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ tiktok_username: handle }) });
  const approved = current?.status === "approved" || isAllowedDuringProof(handle) || (await autoApprove());
  await supabaseRest("creator_access?on_conflict=user_id", json({
    user_id: user.id, status: approved ? "approved" : "waiting", username: handle, reason: null,
    requested_at: current?.status === "approved" ? current.requestedAt : now(),
    decided_at: approved ? (current?.decidedAt ?? now()) : null,
    decided_by: approved && current?.status !== "approved" ? (isAllowedDuringProof(handle) ? "pre-approved handle" : "automatic approval") : null,
  }));
  return approved ? "connected" : "waiting";
}

/** The next creator on the waitlist is invited when a place is free. Returns their handle, or null. */
export async function inviteNext(): Promise<string | null> {
  if ((await placesTaken("00000000-0000-0000-0000-000000000000")) >= PLACES) return null;
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

/** The TikTok Shop token of an approved creator, or null (not linked, not approved yet, or it could not be renewed). */
export async function approvedCreatorToken(userId: string): Promise<string | null> {
  const access = await accessFor(userId);
  if (access?.status !== "approved") return null;
  return freshCreatorToken(await connectionForUser(userId)).catch((err) => {
    console.error("[creator token]", err instanceof Error ? err.message : err);
    return null;
  });
}
