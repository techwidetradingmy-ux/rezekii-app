"use client";

import { NOTE_CATEGORIES, type NoteCategory } from "@/lib/live-notes";

export type NoteFilterValue = "all" | "urgent" | NoteCategory;
export const CAT_LABEL = Object.fromEntries(NOTE_CATEGORIES) as Record<NoteCategory, string>;

/** Filter notifications by label (owner, 31 Oct 2026): important ones first, then each category with how many there are. */
export function NoteFilter({ notes, value, onChange }: { notes: { cat?: NoteCategory; urgent?: string | null }[]; value: NoteFilterValue; onChange: (v: NoteFilterValue) => void }) {
  const urgent = notes.filter((n) => n.urgent).length;
  const cats = NOTE_CATEGORIES.filter(([c]) => notes.some((n) => n.cat === c));
  return (
    <div className="v2-chips" role="group" aria-label="Show">
      <button type="button" className={`v2-chip ${value === "all" ? "on" : ""}`} onClick={() => onChange("all")}>All <small>({notes.length})</small></button>
      {urgent > 0 && <button type="button" className={`v2-chip ${value === "urgent" ? "on" : ""}`} onClick={() => onChange("urgent")}>Needs You <small>({urgent})</small></button>}
      {cats.map(([c, label]) => (
        <button key={c} type="button" className={`v2-chip ${value === c ? "on" : ""}`} onClick={() => onChange(c)}>{label} <small>({notes.filter((n) => n.cat === c).length})</small></button>
      ))}
    </div>
  );
}

export const passes = (n: { cat?: NoteCategory; urgent?: string | null }, v: NoteFilterValue) => v === "all" || (v === "urgent" ? !!n.urgent : n.cat === v);
