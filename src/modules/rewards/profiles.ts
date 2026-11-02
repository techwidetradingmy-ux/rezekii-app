import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { RACES } from "../../lib/countries.ts";
import { tx } from "../../lib/i18n/lang.ts";

/**
 * Saved details (owner, 31 Oct 2026: real data). The creator profile from My Account, or the seller's contact name and phone.
 * Locked once saved: later changes go through support. New Google and TikTok accounts fill it in once, right after sign-up.
 */

export type Side = "creator" | "seller";
export type CreatorDetails = { name: string; birthday: string; country?: string; state: string; whatsapp: string; gender: "Female" | "Male" | "Others"; race?: string; types: string[]; niches: string[] };
export type SellerDetails = { contact: string; phone: string };
export type Saved<T> = { details: T; complete: boolean; savedAt: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+\d{8,15}$/;
const text = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => text(x, 40)).filter(Boolean).slice(0, max) : []);

/** Cleans what the screen sent; null when something required is missing or wrong. */
export function cleanCreator(v: Record<string, unknown>): CreatorDetails | null {
  const gender = v.gender === "Male" || v.gender === "Female" || v.gender === "Others" ? v.gender : null;
  const d: CreatorDetails = {
    name: text(v.name), birthday: text(v.birthday, 10), country: text(v.country, 2).toUpperCase() || "MY", state: text(v.state, 40), whatsapp: text(v.whatsapp, 16),
    gender: gender ?? "Female", types: list(v.types, 6), niches: list(v.niches, 3),
    ...((RACES as readonly string[]).includes(String(v.race)) ? { race: String(v.race) } : {}),
  };
  const age = (Date.now() - Date.parse(d.birthday)) / (365.25 * 86400_000);
  // Race is required (owner, 31 Oct 2026).
  const ok = d.name.length >= 2 && DATE.test(d.birthday) && age >= 13 && age <= 100 && !!d.state && PHONE.test(d.whatsapp) && d.types.length > 0 && d.niches.length > 0 && !!gender && !!d.race;
  return ok ? d : null;
}

export function cleanSeller(v: Record<string, unknown>): SellerDetails | null {
  const d = { contact: text(v.contact), phone: text(v.phone, 16) };
  return d.contact.length >= 2 && PHONE.test(d.phone) ? d : null;
}

/** Whether this account still has to fill in the sign-up details (creators only; admins skip it). */
export async function needsDetails(userId: string): Promise<boolean> {
  const [u] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=role&limit=1`)).json()) as { role: string }[];
  if (!u || u.role === "admin") return false;
  return !(await profileOf(userId, "creator"))?.complete;
}

export async function profileOf<T>(userId: string, side: Side): Promise<Saved<T> | null> {
  const [row] = (await (await supabaseRest(`profiles?user_id=eq.${userId}&side=eq.${side}&select=details,complete,saved_at&limit=1`)).json()) as { details: T; complete: boolean; saved_at: string }[];
  return row ? { details: row.details, complete: row.complete, savedAt: row.saved_at } : null;
}

/** Saves the details once. A creator profile can't be changed here after that (support changes it); seller contacts can. */
export async function saveProfile(userId: string, side: Side, details: CreatorDetails | SellerDetails): Promise<{ ok: true } | { ok: false; error: string }> {
  const had = side === "creator" ? await profileOf<CreatorDetails>(userId, "creator") : null;
  if (had?.complete) {
    // Race can still be added once when it was left empty (owner, 31 Oct 2026); anything else goes through support.
    const race = (details as CreatorDetails).race;
    if (!had.details.race && race) {
      await supabaseRest(`profiles?user_id=eq.${userId}&side=eq.creator`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ details: { ...had.details, race } }) });
      return { ok: true };
    }
    return { ok: false, error: tx("Your profile is saved. Ask support to change it.") };
  }
  await supabaseRest("profiles?on_conflict=user_id,side", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, side, details, complete: true, saved_at: new Date().toISOString() }),
  });
  return { ok: true };
}

/**
 * What's still missing before Today's Ideas and AI Picks unlock (owner, 31 Oct 2026: they need her details for the analysis):
 * the sign-up details, or just her race on a profile saved before race was asked. Null when complete.
 */
export async function detailsMissing(userId: string): Promise<"profile" | "race" | null> {
  const p = await profileOf<CreatorDetails>(userId, "creator");
  if (!p?.complete) return "profile";
  return p.details.race ? null : "race";
}
