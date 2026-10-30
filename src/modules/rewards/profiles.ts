import { supabaseRest } from "../../integrations/supabase/rest.ts";

/**
 * Saved details (owner, 31 Oct 2026: real data). The creator profile from My Account, or the seller's contact name and phone.
 * Locked once saved: later changes go through support. Starter missions and referrals count a saved, complete profile.
 */

export type Side = "creator" | "seller";
export type CreatorDetails = { name: string; birthday: string; state: string; whatsapp: string; gender: "Female" | "Male"; types: string[]; niches: string[] };
export type SellerDetails = { contact: string; phone: string };
export type Saved<T> = { details: T; complete: boolean; savedAt: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+\d{8,15}$/;
const text = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => text(x, 40)).filter(Boolean).slice(0, max) : []);

/** Cleans what the screen sent; null when something required is missing or wrong. */
export function cleanCreator(v: Record<string, unknown>): CreatorDetails | null {
  const d: CreatorDetails = {
    name: text(v.name), birthday: text(v.birthday, 10), state: text(v.state, 40), whatsapp: text(v.whatsapp, 16),
    gender: v.gender === "Male" ? "Male" : "Female", types: list(v.types, 4), niches: list(v.niches, 3),
  };
  const age = (Date.now() - Date.parse(d.birthday)) / (365.25 * 86400_000);
  const ok = d.name.length >= 2 && DATE.test(d.birthday) && age >= 13 && age <= 100 && !!d.state && PHONE.test(d.whatsapp) && d.types.length > 0 && d.niches.length > 0 && (v.gender === "Male" || v.gender === "Female");
  return ok ? d : null;
}

export function cleanSeller(v: Record<string, unknown>): SellerDetails | null {
  const d = { contact: text(v.contact), phone: text(v.phone, 16) };
  return d.contact.length >= 2 && PHONE.test(d.phone) ? d : null;
}

export async function profileOf<T>(userId: string, side: Side): Promise<Saved<T> | null> {
  const [row] = (await (await supabaseRest(`profiles?user_id=eq.${userId}&side=eq.${side}&select=details,complete,saved_at&limit=1`)).json()) as { details: T; complete: boolean; saved_at: string }[];
  return row ? { details: row.details, complete: row.complete, savedAt: row.saved_at } : null;
}

/** Saves the details once. A creator profile can't be changed here after that (support changes it); seller contacts can. */
export async function saveProfile(userId: string, side: Side, details: CreatorDetails | SellerDetails): Promise<{ ok: true } | { ok: false; error: string }> {
  if (side === "creator" && (await profileOf(userId, "creator"))?.complete) return { ok: false, error: "Your profile is saved. Ask support to change it." };
  await supabaseRest("profiles?on_conflict=user_id,side", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, side, details, complete: true, saved_at: new Date().toISOString() }),
  });
  return { ok: true };
}
