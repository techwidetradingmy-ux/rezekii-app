"use client";

import { useEffect, useState } from "react";
import type { IconName } from "@/components/icons";

/** One notification from /api/v2/notifications (signed in). */
export type NoteCategory = "system" | "account" | "products" | "posts" | "rewards" | "chances";
export type LiveNote = { id: string; at: string; icon: IconName; title: string; line: string; href: string | null; cta: string | null; urgent: string | null; unread: boolean; cat: NoteCategory };
/** Labels for the categories, in the order the filter shows them (owner, 31 Oct 2026). */
export const NOTE_CATEGORIES: [NoteCategory, string][] = [["system", "System"], ["account", "Account"], ["products", "Products"], ["posts", "Posts"], ["rewards", "Rewards"], ["chances", "Chances"]];
export type Side = "creator" | "seller";

export async function loadNotes(side: Side): Promise<{ notes: LiveNote[]; unread: number } | null> {
  const r = await fetch(`/api/v2/notifications?side=${side}`, { cache: "no-store" }).catch(() => null);
  return r?.ok ? r.json() : null;
}

/** Marks one read (id) or all of them (null), and tells the bell how many are left unread. */
export async function markNote(side: Side, id: string | null, left?: number): Promise<void> {
  await fetch("/api/v2/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(id ? { side, id } : { side, all: true }) }).catch(() => null);
  notesChanged(left);
}

const NOTES_CHANGED = "rz-notes-changed";
/**
 * Tells the bell its number (owner, 2 Nov 2026: notifications were slow, as the bell built her whole list again each time); with
 * no number, the bell counts again (after she changes what she wants to see).
 */
export const notesChanged = (unread?: number) => window.dispatchEvent(new CustomEvent(NOTES_CHANGED, { detail: unread }));
const MYT = 8 * 3_600_000;
const dayNo = (t: number) => Math.floor((t + MYT) / 86_400_000);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const hm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

/** "Today" or "Earlier", by the Malaysia day. */
export const noteDay = (at: string): "Today" | "Earlier" => (dayNo(Date.parse(at)) >= dayNo(Date.now()) ? "Today" : "Earlier");
/** "10:24", "Yesterday 21:40" or "26 Oct". */
export function noteWhen(at: string): string {
  const t = Date.parse(at);
  const ago = dayNo(Date.now()) - dayNo(t);
  if (ago <= 0) return hm(t);
  if (ago === 1) return `Yesterday ${hm(t)}`;
  const d = new Date(t + MYT);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const BG: Partial<Record<IconName, string>> = {
  gift: "linear-gradient(135deg,#7aa2ff,#1d4ed8)",
  trophy: "linear-gradient(135deg,#ffd34d,#e8a400)",
  flame: "linear-gradient(135deg,#ffb35c,#f08a00)",
  users: "linear-gradient(135deg,#22dc95,#00a862)",
  wallet: "linear-gradient(135deg,#22dc95,#00a862)",
  refresh: "linear-gradient(135deg,#7aa2ff,#1d4ed8)",
  video: "linear-gradient(135deg,#ff7aa8,#e8005a)",
  alert: "linear-gradient(135deg,#ffb35c,#f08a00)",
  link: "linear-gradient(135deg,#ffb35c,#f08a00)",
  x: "linear-gradient(135deg,#9aa8a1,#62716a)",
  box: "linear-gradient(135deg,#7aa2ff,#1d4ed8)",
};
export const noteBg = (icon: IconName) => BG[icon] ?? "linear-gradient(135deg,#22dc95,#00a862)";

/** The bell's number: unread notifications, checked on load, every 5 minutes and when she reads some. */
export function useUnreadNotes(side: Side, on: boolean): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true;
    const load = () =>
      fetch(`/api/v2/notifications?side=${side}&count=1`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { unread?: number } | null) => live && d && setN(d.unread ?? 0))
        .catch(() => {});
    const told = (e: Event) => { const d = (e as CustomEvent<number | undefined>).detail; if (typeof d === "number") setN(d); else void load(); };
    // On the Notifications screen the list itself tells the bell.
    if (!window.location.pathname.endsWith("/notifications")) void load();
    const every = window.setInterval(load, 5 * 60_000);
    window.addEventListener(NOTES_CHANGED, told);
    return () => { live = false; window.clearInterval(every); window.removeEventListener(NOTES_CHANGED, told); };
  }, [side, on]);
  return n;
}
