import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { AppUser } from "../accounts/users.ts";
import type { Platform } from "./rules.ts";

/**
 * Facebook, Instagram and Threads posting, for every signed-in account (owner, 23 Oct 2026: Meta's App Review tests it as a
 * creator). Meta approved the posting and comment permissions for everyone on 9 Nov 2026.
 */
export const canUseSocial = (u: Pick<AppUser, "role"> | null | undefined) => !!u;

export const isPlatform = (p: string | null | undefined): p is Platform => p === "facebook" || p === "instagram" || p === "threads";

/**
 * Which Meta permissions an account is asked for when it connects a channel:
 * - "community": Admins (they have a role on the Meta app), every permission Community uses;
 * - "insights": views and reach (Facebook, Instagram, Threads) and reading Threads replies, the four permissions in Meta's
 *   second review (owner, 12 Nov 2026). Only the accounts Meta reviews with (app setting meta_review_users, a list of
 *   account ids) until Meta approves them; then everyone, once app setting meta_insights_everyone is true;
 * - "basic": what Meta approved for everyone on 9 Nov 2026 (posting, comments, followers and post counts).
 */
export type MetaLevel = "basic" | "insights" | "community";

/** The two settings above, read together. */
export async function insightsAccess(): Promise<{ everyone: boolean; users: Set<string> }> {
  const rows = (await (await supabaseRest("app_settings?key=in.(meta_review_users,meta_insights_everyone)&select=key,value")).json().catch(() => [])) as { key: string; value: unknown }[];
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const users = get("meta_review_users");
  return { everyone: get("meta_insights_everyone") === true, users: new Set(Array.isArray(users) ? users.filter((u): u is string => typeof u === "string") : []) };
}

export const levelFor = (u: Pick<AppUser, "id" | "role">, a: { everyone: boolean; users: Set<string> }): MetaLevel =>
  u.role === "admin" ? "community" : a.everyone || a.users.has(u.id) ? "insights" : "basic";

export async function metaLevel(u: Pick<AppUser, "id" | "role">): Promise<MetaLevel> {
  return u.role === "admin" ? "community" : levelFor(u, await insightsAccess().catch(() => ({ everyone: false, users: new Set<string>() })));
}
