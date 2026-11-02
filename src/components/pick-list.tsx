"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import "@/app/creator1.css";

/**
 * A dropdown you can search by typing (owner, 31 Oct 2026: long lists are dropdowns, and typing finds an option without
 * scrolling). One choice, or several (`multi`) up to `max`. Options are [value, label]. Shared since 3 Nov 2026 (sign-up, the
 * delivery address's City).
 */
export function PickList({ label, options, value, onChange, max, multi = false, invalid, placeholder = "Choose", compact = false, shown: showAs }: {
  label: string; options: [string, string][]; value: string[]; onChange: (v: string[]) => void; max?: number; multi?: boolean; invalid?: boolean; placeholder?: string; compact?: boolean;
  /** What the closed dropdown shows for the choice, when shorter than its label (e.g. "+60"). */
  shown?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return setQ("");
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const labelOf = (v: string) => options.find(([o]) => o === v)?.[1] ?? v;
  const shown = q.trim() ? options.filter(([, l]) => l.toLowerCase().includes(q.trim().toLowerCase())) : options;
  const pick = (v: string) => {
    if (!multi) {
      onChange([v]);
      setOpen(false);
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className={`su-pick${compact ? " sm" : ""}`} ref={box}>
      <button type="button" className="np-input su-pick-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid} onClick={() => setOpen((o) => !o)}>
        <span className={value.length ? undefined : "ph"}>{value.length ? (showAs ? showAs(value[0]) : labelOf(value[0])) : max && multi ? `Up to ${max}` : placeholder}</span>
        {value.length > 1 && <em>+{value.length - 1}</em>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="su-pick-list" role="listbox" aria-multiselectable={multi} aria-label={label}>
          {options.length > 7 && (
            <input className="np-input su-pick-q" autoFocus placeholder="Type to search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${label}`}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (shown[0]) pick(shown[0][0]); } }} />
          )}
          {shown.map(([v, l]) => {
            const on = value.includes(v);
            return (
              <button key={v} type="button" role="option" aria-selected={on} disabled={multi && !on && !!max && value.length >= max} onClick={() => pick(v)}>
                <i className={multi ? undefined : "one"}>{on && <Icon name="check" size={13} width={3.2} />}</i>
                {l}
              </button>
            );
          })}
          {!shown.length && <p className="su-pick-none">No match</p>}
          {multi && <button type="button" className="su-pick-done" onClick={() => setOpen(false)}>Done</button>}
        </div>
      )}
    </div>
  );
}
