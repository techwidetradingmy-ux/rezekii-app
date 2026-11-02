"use client";

import { NOTE_CATEGORIES, type NoteCategory } from "@/lib/live-notes";
import { useT } from "@/lib/i18n/client";

export type NoteFilterValue = "all" | "urgent" | NoteCategory;
/** Each category's label in English; show it with t(CAT_LABEL[cat]). */
export const CAT_LABEL = Object.fromEntries(NOTE_CATEGORIES) as Record<NoteCategory, string>;

/** Filter notifications by label (owner, 31 Oct 2026): important ones first, then each category with how many there are. */
export function NoteFilter({ notes, value, onChange }: { notes: { cat?: NoteCategory; urgent?: string | null }[]; value: NoteFilterValue; onChange: (v: NoteFilterValue) => void }) {
  const t = useT();
  const urgent = notes.filter((n) => n.urgent).length;
  const cats = NOTE_CATEGORIES.filter(([c]) => notes.some((n) => n.cat === c));
  return (
    <div className="v2-chips" role="group" aria-label={t("Show")}>
      <button type="button" className={`v2-chip ${value === "all" ? "on" : ""}`} onClick={() => onChange("all")}>{t("All")} <small>({notes.length})</small></button>
      {urgent > 0 && <button type="button" className={`v2-chip ${value === "urgent" ? "on" : ""}`} onClick={() => onChange("urgent")}>{t("Needs You")} <small>({urgent})</small></button>}
      {cats.map(([c, label]) => (
        <button key={c} type="button" className={`v2-chip ${value === c ? "on" : ""}`} onClick={() => onChange(c)}>{t(label)} <small>({notes.filter((n) => n.cat === c).length})</small></button>
      ))}
    </div>
  );
}

export const passes = (n: { cat?: NoteCategory; urgent?: string | null }, v: NoteFilterValue) => v === "all" || (v === "urgent" ? !!n.urgent : n.cat === v);
