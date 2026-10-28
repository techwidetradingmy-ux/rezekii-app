"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-07" for year, month (0-11) and day. */
export const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const dayName = (s: string) => { const [, m, d] = s.split("-").map(Number); return `${d} ${SHORT[m - 1]}`; };
export const between = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400_000) + 1;

type Props = {
  label: string;
  sub?: string;
  /** Today, marked in the calendar; also the last day that can be picked unless `last` says otherwise. */
  today: string;
  /** Last day that can be picked, e.g. weeks ahead for scheduled posts. */
  last?: string;
  /** First day that can be picked, e.g. when the creator joined. */
  first?: string;
  from: string;
  to: string;
  onRange: (from: string, to: string) => void;
  presets: [string, string][];
  preset: string | null;
  onPreset: (key: string) => void;
};

/**
 * V1's date picker (owner, 14 Oct 2026): a button showing the choice, opening quick choices beside a calendar where any start
 * and end day can be tapped; a bottom sheet on a phone.
 */
export function CalendarPicker(p: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [cal, setCal] = useState(() => { const [y, m] = p.to.split("-").map(Number); return { y, m: m - 1 }; });
  const [pick, setPick] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const close = () => { setOpen(false); setPick(null); setHover(null); };
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => { const r = btn.current!.getBoundingClientRect(); setPos({ top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) }); };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const toggle = () => {
    if (!open) { const [y, m] = p.to.split("-").map(Number); setCal({ y, m: m - 1 }); }
    setOpen(!open);
  };

  const first = p.first ?? "2000-01-01";
  const last = p.last ?? p.today;
  const atLast = iso(cal.y, cal.m, 1) >= last.slice(0, 8) + "01";
  const atFirst = iso(cal.y, cal.m, 1) <= first.slice(0, 8) + "01";
  const move = (k: number) => setCal(({ y, m }) => ({ y: y + Math.floor((m + k) / 12), m: (((m + k) % 12) + 12) % 12 }));
  const lead = (new Date(Date.UTC(cal.y, cal.m, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(cal.y, cal.m + 1, 0)).getUTCDate();

  // The band to highlight: the range being picked (start + hovered day), or the current choice.
  const [lo, hi] = pick ? [pick, hover ?? pick].sort() : [p.from, p.to];
  const tap = (s: string) => {
    if (!pick) { setPick(s); return; }
    const [a, b] = [pick, s].sort();
    p.onRange(a, b);
    close();
  };
  const n = between(p.from, p.to);

  const panel = open && pos && (
    <>
      <button type="button" aria-label="Close" className="cp-dim" onClick={close} />
      <div role="dialog" aria-label="Choose dates" className="cp-pop" style={{ top: pos.top, right: pos.right }}>
        <span className="cp-grab" aria-hidden="true" />
        <div className="cp-presets" role="group" aria-label="Quick choices">
          {p.presets.map(([k, label]) => <button key={k} type="button" className={`cp-pre ${p.preset === k ? "on" : ""}`} onClick={() => { p.onPreset(k); close(); }}>{label}</button>)}
        </div>
        <div className="cp-cal">
          <div className="cp-head">
            <button type="button" className="cp-nav" aria-label="Previous month" disabled={atFirst} onClick={() => move(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <strong>{MONTHS[cal.m]} {cal.y}</strong>
            <button type="button" className="cp-nav" aria-label="Next month" disabled={atLast} onClick={() => move(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div className="cp-week" aria-hidden="true">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="cp-days" onMouseLeave={() => setHover(null)}>
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: daysIn }, (_, i) => {
              const s = iso(cal.y, cal.m, i + 1);
              const off = s > last || s < first;
              const inBand = s >= lo && s <= hi;
              const edge = s === lo || s === hi;
              const col = (lead + i) % 7;
              return (
                <span key={s} className={`cp-cell ${inBand && lo !== hi ? "band" : ""} ${s === lo ? "lo" : ""} ${s === hi ? "hi" : ""} ${col === 0 ? "c0" : ""} ${col === 6 ? "c6" : ""}`}>
                  <button type="button" className={`cp-day ${inBand && edge ? "edge" : ""} ${s === p.today ? "today" : ""}`} disabled={off} onClick={() => tap(s)} onMouseEnter={() => pick && setHover(s)} aria-label={`${i + 1} ${MONTHS[cal.m]} ${cal.y}`} aria-pressed={inBand}>{i + 1}</button>
                </span>
              );
            })}
          </div>
          <span className="cp-hint">
            {pick ? `From ${dayName(pick)} · now tap the last day` : `${dayName(p.from)} – ${dayName(p.to)} · ${n} day${n === 1 ? "" : "s"} · tap a start day to pick your own`}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button ref={btn} type="button" className="cp-btn" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, minWidth: 0 }}>
          <strong>{p.label}</strong>
          {p.sub && <span className="cp-sub">{p.sub}</span>}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}
