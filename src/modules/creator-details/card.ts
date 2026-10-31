import { supabaseRest } from "../../integrations/supabase/rest.ts";

export type Address = { to: string; phone: string; line: string; postcode: string; city: string; state: string; country: string };
/** Prices are whole ringgit as typed (strings, so an empty box stays empty). */
export type Rate = { on: boolean; price: string; days?: number };
export type Pack = { id: number; name: string; qty: Record<string, number>; price: string };
export type Card = { rates: Record<string, Rate>; packs: Pack[]; show: "À la carte" | "Packages" | "Both" };

const KEYS = ["tt-video", "tt-live", "ig-reel", "ig-story", "fb-reel", "fb-post", "th-post", "rights"];
const DAYS = [7, 14, 30, 60, 90, 180, 365];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const price = (v: unknown) => (typeof v === "string" ? v.replace(/[^\d]/g, "").slice(0, 6) : "");
const upsert = (table: string, body: unknown) =>
  supabaseRest(`${table}?on_conflict=user_id`, { method: "POST", headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(body) });

/** A Malaysian delivery address, checked the same way as on the page. */
export function cleanAddress(v: Record<string, unknown>): Address | null {
  // Any country (owner, 31 Oct 2026): Malaysia keeps the 5-digit postcode; elsewhere it's the local format, or none.
  const country = (text(v.country, 2) || "MY").toUpperCase();
  const a = { to: text(v.to, 80), phone: text(v.phone, 24), line: text(v.line, 200), postcode: text(v.postcode, 10), city: text(v.city, 60), state: text(v.state, 60), country };
  const postcode = country === "MY" ? /^\d{5}$/.test(a.postcode) : a.postcode === "" || /^[A-Za-z0-9 -]{2,10}$/.test(a.postcode);
  return /^[A-Z]{2}$/.test(country) && a.to.length > 1 && a.line.length > 4 && postcode && a.city.length > 1 && !!a.state ? a : null;
}

export async function addressOf(userId: string): Promise<Address | null> {
  const [row] = (await (await supabaseRest(`delivery_addresses?user_id=eq.${userId}&select=address&limit=1`)).json()) as { address: Address }[];
  return row?.address ?? null;
}
export async function saveAddressFor(userId: string, a: Address): Promise<boolean> {
  return (await upsert("delivery_addresses", { user_id: userId, address: a, updated_at: new Date().toISOString() })).ok;
}

/** Her rate card as sent by the page, kept to the known items, 3 packages and sensible numbers. */
export function cleanCard(v: Record<string, unknown>): Card {
  const inRates = (v.rates ?? {}) as Record<string, Record<string, unknown>>;
  const rates = Object.fromEntries(KEYS.map((k) => {
    const r = inRates[k] ?? {};
    const days = Number(r.days);
    return [k, { on: r.on === true, price: price(r.price), ...(k === "rights" ? { days: DAYS.includes(days) ? days : 180 } : {}) }];
  }));
  const packs = (Array.isArray(v.packs) ? v.packs : []).slice(0, 3).map((p: Record<string, unknown>, i: number) => ({
    id: Number(p.id) || i + 1,
    name: text(p.name, 40),
    qty: Object.fromEntries(KEYS.map((k) => [k, Math.max(0, Math.min(k === "rights" ? 365 : 10, Math.round(Number((p.qty as Record<string, unknown> | undefined)?.[k]) || 0)))])),
    price: price(p.price),
  }));
  const show = v.show === "À la carte" || v.show === "Packages" ? v.show : "Both";
  return { rates, packs, show };
}

export async function cardOf(userId: string): Promise<{ card: Card; savedAt: string } | null> {
  const [row] = (await (await supabaseRest(`rate_cards?user_id=eq.${userId}&select=card,updated_at&limit=1`)).json()) as { card: Card; updated_at: string }[];
  return row ? { card: row.card, savedAt: row.updated_at } : null;
}
export async function saveCardFor(userId: string, card: Card): Promise<boolean> {
  return (await upsert("rate_cards", { user_id: userId, card, updated_at: new Date().toISOString() })).ok;
}
